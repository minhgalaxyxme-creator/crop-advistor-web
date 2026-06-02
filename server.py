import json
import os
import urllib.error
import urllib.request

from flask import Flask, jsonify, request, send_from_directory


app = Flask(__name__, static_folder=".", static_url_path="")

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-2.5-flash"


@app.get("/")
def index():
    return send_from_directory(".", "index.html")


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
