import csv
import json
import math
import os
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory


app = Flask(__name__, static_folder=".", static_url_path="")

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-2.5-flash"
DATASET_PATH = Path(__file__).with_name("Vietnam_Crop_Feature_Engineered.csv")

MODEL_FEATURES = [
    "Elevation (m)",
    "Temp_Mean (°C)",
    "phh2o (pH)",
    "nitrogen (g/kg)",
    "clay (%)",
    "sand (%)",
    "silt (%)",
    "Dry_Season_Deficit (mm)",
    "Acidification_Risk (index)",
    "Rain_Concentration_Index",
]

FEATURE_ALIASES = {
    "elevation": "Elevation (m)",
    "temperature": "Temp_Mean (°C)",
    "ph": "phh2o (pH)",
    "nitrogen": "nitrogen (g/kg)",
    "clay": "clay (%)",
    "sand": "sand (%)",
    "silt": "silt (%)",
    "drySeasonDeficit": "Dry_Season_Deficit (mm)",
    "acidificationRisk": "Acidification_Risk (index)",
    "rainConcentrationIndex": "Rain_Concentration_Index",
}

FEATURE_CONFIG = {
    "elevation": {"label": "Độ cao", "unit": "m", "weight": 0.9},
    "temperature": {"label": "Nhiệt độ", "unit": "°C", "weight": 1.2},
    "ph": {"label": "Độ pH", "unit": "", "weight": 1.25},
    "nitrogen": {"label": "Nitơ", "unit": "g/kg", "weight": 1.0},
    "clay": {"label": "Sét", "unit": "%", "weight": 0.8},
    "sand": {"label": "Cát", "unit": "%", "weight": 0.8},
    "silt": {"label": "Thịt/bùn", "unit": "%", "weight": 0.8},
    "drySeasonDeficit": {"label": "Thiếu nước mùa khô", "unit": "mm", "weight": 1.15},
    "acidificationRisk": {"label": "Rủi ro chua/phèn", "unit": "", "weight": 1.15},
    "rainConcentrationIndex": {"label": "Tập trung mưa", "unit": "", "weight": 0.9},
}

CROP_META = {
    "Coffee": {"name": "Cà phê", "icon": "☕", "description": "Cây công nghiệp dài ngày, hợp cao nguyên mát và đất đủ dinh dưỡng."},
    "Durian": {"name": "Sầu riêng", "icon": "🌳", "description": "Cây ăn trái giá trị cao, cần nước ổn định, đất thoát nước và ít stress chua/phèn."},
    "Maize": {"name": "Bắp", "icon": "🌽", "description": "Cây ngắn ngày, có thể cân nhắc ở nhiều vùng nếu điều kiện nước và đất phù hợp."},
    "Mango": {"name": "Xoài", "icon": "🥭", "description": "Cây ăn trái chịu khô tương đối tốt hơn, phù hợp nơi thoát nước và không quá lạnh."},
    "Pepper": {"name": "Hồ tiêu", "icon": "🌶️", "description": "Cây gia vị lâu năm, nhạy với đất quá chua/phèn và cần quản lý thoát nước kỹ."},
    "Rice": {"name": "Lúa", "icon": "🌾", "description": "Cây lương thực chính, ưu tiên vùng thấp và điều kiện nước thuận lợi."},
    "Rubber": {"name": "Cao su", "icon": "🌳", "description": "Cây công nghiệp dài ngày, chịu điều kiện đất chua tương đối tốt hơn nhóm cây mẫn cảm."},
}


def clean_vietnam_number(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.count(".") > 1:
        head, tail = text.rsplit(".", 1)
        text = head.replace(".", "") + "." + tail
    text = text.replace(",", ".")
    try:
        number = float(text)
    except ValueError:
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def percentile(values, q):
    if not values:
        return 0
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    pos = (len(ordered) - 1) * q
    lower = math.floor(pos)
    upper = math.ceil(pos)
    if lower == upper:
        return ordered[int(pos)]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (pos - lower)


def clamp(value, min_value, max_value):
    return min(max(value, min_value), max_value)


@lru_cache(maxsize=1)
def load_model_assets():
    rows = []
    values_by_crop = defaultdict(lambda: defaultdict(list))
    months_by_crop = defaultdict(Counter)

    with DATASET_PATH.open(newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        for raw_row in reader:
            crop = raw_row.get("Crop_Label", "").strip()
            if not crop:
                continue

            parsed = {feature: clean_vietnam_number(raw_row.get(feature)) for feature in MODEL_FEATURES}
            if any(value is None for value in parsed.values()):
                continue

            rows.append({"Crop_Label": crop, **parsed})
            for feature, value in parsed.items():
                values_by_crop[crop][feature].append(value)

            month = clean_vietnam_number(raw_row.get("Planting_Month (month)"))
            if month is not None and 1 <= month <= 12 and float(month).is_integer():
                months_by_crop[crop][int(month)] += 1

    profiles = []
    for crop in sorted(values_by_crop):
        meta = CROP_META.get(crop, {"name": crop, "icon": "🌱", "description": "Cây trồng có trong bộ dữ liệu mới."})
        metrics = {}
        for ui_key, feature in FEATURE_ALIASES.items():
            values = values_by_crop[crop][feature]
            metrics[ui_key] = [round(percentile(values, 0.1), 3), round(percentile(values, 0.5), 3), round(percentile(values, 0.9), 3)]

        common_months = [month for month, _ in months_by_crop[crop].most_common(4)]
        common_months.sort()
        profiles.append({
            "datasetLabel": crop,
            "name": meta["name"],
            "icon": meta["icon"],
            "description": meta["description"],
            "count": len(values_by_crop[crop][MODEL_FEATURES[0]]),
            "months": common_months,
            "season": format_months(common_months),
            "metrics": metrics,
        })

    return {
        "rows": len(rows),
        "source": DATASET_PATH.name,
        "features": MODEL_FEATURES,
        "featureConfig": FEATURE_CONFIG,
        "profiles": profiles,
    }


def format_months(months):
    if not months:
        return "Theo điều kiện thực tế"
    return "Tháng " + ", ".join(str(month) for month in months)


def normalize_input(payload):
    input_values = {}
    missing = []
    for ui_key in FEATURE_ALIASES:
        value = clean_vietnam_number(payload.get(ui_key))
        if value is None:
            missing.append(ui_key)
        else:
            input_values[ui_key] = value
    planting_month = clean_vietnam_number(payload.get("plantingMonth"))
    if planting_month is not None:
        input_values["plantingMonth"] = int(clamp(round(planting_month), 1, 12))
    return input_values, missing


@app.get("/")
def index():
    return send_from_directory(".", "index.html")


@app.get("/api/metadata")
def metadata():
    return jsonify(load_model_assets())


@app.post("/api/recommend")
def recommend():
    payload = request.get_json(silent=True) or {}
    input_values, missing = normalize_input(payload)
    if missing:
        return jsonify({"error": "Thiếu hoặc sai các chỉ số: " + ", ".join(missing)}), 400

    assets = load_model_assets()
    ranked = [score_crop(profile, input_values) for profile in assets["profiles"]]
    ranked.sort(key=lambda item: item["score"], reverse=True)

    return jsonify({
        "input": input_values,
        "dataset": {"source": assets["source"], "rows": assets["rows"], "features": assets["features"]},
        "ranking": ranked,
        "warnings": collect_soft_warnings(input_values),
    })


def score_crop(profile, input_values):
    detail = []
    weighted_sum = 0
    total_weight = 0

    for key, config in FEATURE_CONFIG.items():
        min_value, optimal, max_value = profile["metrics"][key]
        value = input_values[key]
        score = score_value(value, min_value, optimal, max_value)
        weight = config["weight"]
        weighted_sum += score * weight
        total_weight += weight
        detail.append({
            "key": key,
            "label": config["label"],
            "unit": config["unit"],
            "value": value,
            "min": min_value,
            "optimal": optimal,
            "max": max_value,
            "score": round(score),
            "weight": weight,
        })

    raw_score = weighted_sum / total_weight if total_weight else 0
    multiplier = soft_penalty_multiplier(profile["datasetLabel"], input_values)
    score = round(clamp(raw_score * multiplier, 0, 100))

    strong = max(detail, key=lambda item: item["score"])
    weak = min(detail, key=lambda item: item["score"])
    is_season_match = input_values.get("plantingMonth") in profile.get("months", [])

    return {
        **profile,
        "score": score,
        "level": get_level(score),
        "detail": detail,
        "strong": strong,
        "weak": weak,
        "isSeasonMatch": is_season_match,
        "modelNote": "Random-Forest feature set + bộ lọc soft penalty được mô phỏng bằng thống kê phân vị để chạy trực tiếp trên web Flask.",
    }


def score_value(value, min_value, optimal, max_value):
    if value == optimal:
        return 100
    if min_value >= max_value:
        return 100 if value == optimal else 60
    if value < min_value or value > max_value:
        nearest = min_value if value < min_value else max_value
        span = max(max_value - min_value, 1)
        penalty = abs(value - nearest) / span * 100
        return clamp(55 - penalty, 0, 55)

    span = optimal - min_value if value < optimal else max_value - optimal
    if span <= 0:
        return 100
    distance = abs(value - optimal)
    return clamp(100 - distance / span * 38, 60, 100)


def soft_penalty_multiplier(crop_label, input_values):
    multiplier = 1.0
    if input_values["drySeasonDeficit"] > 200:
        if crop_label == "Rice":
            multiplier *= 0.3
        elif crop_label == "Maize":
            multiplier *= 0.8

    if input_values["acidificationRisk"] > 3000 or input_values["ph"] < 4.5:
        if crop_label == "Pepper":
            multiplier *= 0.4
        elif crop_label == "Coffee":
            multiplier *= 0.5
        elif crop_label == "Rubber":
            multiplier *= 1.1

    if input_values["nitrogen"] < 20 and crop_label == "Coffee":
        multiplier *= 0.7

    return multiplier


def collect_soft_warnings(input_values):
    warnings = []
    if input_values["drySeasonDeficit"] > 200:
        warnings.append("Thâm hụt nước mùa khô cao: giảm ưu tiên lúa, giảm nhẹ bắp.")
    if input_values["acidificationRisk"] > 3000 or input_values["ph"] < 4.5:
        warnings.append("Đất chua/phèn: giảm ưu tiên hồ tiêu và cà phê, tăng nhẹ cao su.")
    if input_values["nitrogen"] < 20:
        warnings.append("Đất nghèo Nitơ: giảm ưu tiên cà phê.")
    return warnings or ["Chưa kích hoạt cảnh báo soft penalty lớn."]


def get_level(score):
    if score >= 88:
        return "Rất phù hợp"
    if score >= 74:
        return "Phù hợp"
    if score >= 58:
        return "Có thể cân nhắc"
    return "Không ưu tiên"


@app.post("/api/chat")
def chat():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "Chưa có biến môi trường GEMINI_API_KEY."}), 400

    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()
    context = payload.get("context", {})

    if not message:
        return jsonify({"error": "Tin nhắn đang rỗng."}), 400

    try:
        reply = ask_gemini(api_key, message, context)
    except urllib.error.HTTPError as error:
        return jsonify({"error": format_gemini_http_error(error)}), 502
    except Exception as error:
        return jsonify({"error": f"Không gọi được Gemini API: {error}"}), 502

    return jsonify({"reply": reply})


def ask_gemini(api_key, message, context):
    model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
    url = GEMINI_ENDPOINT.format(model=model)

    prompt = build_prompt(message, context)
    body = {
        "systemInstruction": {
            "parts": [
                {
                    "text": (
                        "Bạn là trợ lý tư vấn cây trồng cho một web demo tiếng Việt. "
                        "Trả lời ngắn gọn, thực tế, dựa trên dữ liệu người dùng gửi. "
                        "Nếu thông tin chưa đủ, nói rõ đây là gợi ý tham khảo và nên kiểm tra thực địa."
                    )
                }
            ]
        },
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.35,
            "maxOutputTokens": 600,
        },
    }

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.loads(response.read().decode("utf-8"))

    try:
        return result["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        return "Gemini đã phản hồi nhưng không có nội dung văn bản phù hợp."


def format_gemini_http_error(error):
    detail = error.read().decode("utf-8", errors="replace")
    try:
        parsed = json.loads(detail)
        status = parsed.get("error", {}).get("status", "")
        message = parsed.get("error", {}).get("message", "")
    except json.JSONDecodeError:
        status = ""
        message = detail

    if error.code == 503 or status == "UNAVAILABLE":
        return "Gemini đang quá tải tạm thời. Hãy thử gửi lại sau vài phút."
    if error.code == 401 or error.code == 403:
        return "Gemini từ chối API key. Hãy kiểm tra lại key hoặc quyền truy cập API."
    if error.code == 429:
        return "Gemini đang giới hạn lượt gọi API. Hãy chờ một lúc rồi thử lại."

    clean_message = message or "Không rõ lỗi."
    return f"Gemini API trả lỗi {error.code}: {clean_message}"


def build_prompt(message, context):
    context_text = json.dumps(context, ensure_ascii=False, indent=2)
    return (
        "Dữ liệu hiện tại của web:\n"
        f"{context_text}\n\n"
        "Câu hỏi của người dùng:\n"
        f"{message}\n\n"
        "Hãy trả lời bằng tiếng Việt. Không bịa thêm cây ngoài danh sách nếu người dùng hỏi về kết quả hiện tại."
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    print(f"Đang chạy web tại http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
