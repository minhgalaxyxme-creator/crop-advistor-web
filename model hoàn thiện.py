import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, top_k_accuracy_score
import warnings

warnings.filterwarnings('ignore')

print("="*85)
print(" HỆ THỐNG GỢI Ý CÂY TRỒNG TÍCH HỢP HỌC MÁY & SOFT PENALTY ".center(85))
print("="*85 + "\n")

# ==========================================
# 1. TIỀN XỬ LÝ & LỰA CHỌN ĐẶC TRƯNG (VERSION A)
# ==========================================
file_name = "Vietnam_Crop_Feature_Engineered.csv"
try:
    df = pd.read_csv(file_name)
except FileNotFoundError:
    print(f"⚠️ Không tìm thấy file {file_name}!")
    raise

def clean_vietnam_number_format(series):
    return pd.to_numeric(series.astype(str).str.replace(r'\.(?=[^.]*\.)', '', regex=True), errors='coerce')

for col in ['Elevation (m)', 'Dry_Season_Deficit (mm)', 'Acidification_Risk (index)']:
    df[col] = clean_vietnam_number_format(df[col])

# VERSION A: Chỉ sử dụng các biến tự nhiên (Không Planting_Month, Không Final_Risk)
features = [
    'Elevation (m)', 'Temp_Mean (°C)', 'phh2o (pH)',
    'nitrogen (g/kg)', 'clay (%)', 'sand (%)', 'silt (%)',
    'Dry_Season_Deficit (mm)', 'Acidification_Risk (index)', 'Rain_Concentration_Index'
]

df_clean = df.dropna(subset=features + ['Crop_Label'])
X = df_clean[features]
y = df_clean['Crop_Label']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# ==========================================
# 2. HUẤN LUYỆN MÔ HÌNH (CẤU HÌNH TỐI ƯU MỚI)
# ==========================================
print("▶️ Đang huấn luyện Random Forest (n_estimators=300, max_depth=15)...")
# Đã bỏ class_weight='balanced' vì dataset gốc đã cân bằng
model = RandomForestClassifier(n_estimators=300, max_depth=15, random_state=42)
model.fit(X_train, y_train)
classes = model.classes_
print(" ✅ Huấn luyện hoàn tất!\n")

# ==========================================
# 3. ĐÁNH GIÁ (NĂNG LỰC LÕI)
# ==========================================
print(" 📊 BÁO CÁO NĂNG LỰC MÔ HÌNH LÕI (Không rò rỉ dữ liệu) ")
y_pred = model.predict(X_test)
probas = model.predict_proba(X_test)

print(f"   - Top-1 Accuracy: {accuracy_score(y_test, y_pred)*100:.2f}% (Phản ánh sự giao thoa sinh thái thực tế)")
print(f"   - Top-2 Accuracy: {top_k_accuracy_score(y_test, probas, k=2, labels=classes)*100:.2f}%")
print(f"   - Top-3 Accuracy: {top_k_accuracy_score(y_test, probas, k=3, labels=classes)*100:.2f}% (Rất phù hợp để làm Recommendation)\n")


# ==========================================
# 4. INFERENCE ENGINE: ÁP DỤNG "SOFT PENALTY" ĐỂ FIX NHẦM LẪN
# ==========================================
print("="*85)
print(" 🤖 CHẠY THỬ NGHIỆM INFERENCE KÈM BỘ LỌC SOFT PENALTY ")
print("="*85)

test_case_1 = {
    'ID_Vung': 'Đất khô hạn - Đắk Lắk', 'Planting_Month (month)': 5, 
    'Elevation (m)': 550.0, 'Temp_Mean (°C)': 24.5, 'phh2o (pH)': 5.2,
    'nitrogen (g/kg)': 35.0, 'clay (%)': 35.0, 'sand (%)': 30.0, 'silt (%)': 35.0,
    'Dry_Season_Deficit (mm)': 250.0, 'Acidification_Risk (index)': 2500.0, 'Rain_Concentration_Index': 0.35
}

test_case_2 = {
    'ID_Vung': 'Đất phèn - Đồng Tháp', 'Planting_Month (month)': 11,
    'Elevation (m)': 15.0, 'Temp_Mean (°C)': 28.0, 'phh2o (pH)': 4.2,
    'nitrogen (g/kg)': 15.0, 'clay (%)': 45.0, 'sand (%)': 15.0, 'silt (%)': 40.0,
    'Dry_Season_Deficit (mm)': 100.0, 'Acidification_Risk (index)': 4000.0, 'Rain_Concentration_Index': 0.85
}

results_list = []
for case in [test_case_1, test_case_2]:
    # Trích xuất đúng features cho model
    case_input = {k: case[k] for k in features}
    case_df = pd.DataFrame([case_input])
    
    raw_probas = model.predict_proba(case_df)[0]
    preds = {classes[i]: raw_probas[i] * 100 for i in range(len(classes))}

    # -------------------------------------------------------------
    # BỘ LỌC SOFT PENALTY (Fix nhầm lẫn từ Confusion Matrix)
    # -------------------------------------------------------------
    warnings_list = []
    
    # Fix 1: Rice vs Maize (Nếu thiếu nước mùa khô cao -> Phạt nặng lúa, phạt nhẹ ngô)
    if case['Dry_Season_Deficit (mm)'] > 200:
        preds['Rice'] *= 0.3
        preds['Maize'] *= 0.8
        warnings_list.append("Thâm hụt nước cao (Lúa bị giảm ưu tiên)")

    # Fix 2: Pepper vs Coffee vs Rubber (Tiêu sợ chua, Cà phê cần dinh dưỡng, Cao su dễ sống)
    if case['Acidification_Risk (index)'] > 3000 or case['phh2o (pH)'] < 4.5:
        preds['Pepper'] *= 0.4
        preds['Coffee'] *= 0.5
        preds['Rubber'] *= 1.1 # Thưởng nhẹ cho cao su vì chịu phèn/chua tốt
        warnings_list.append("Đất phèn/chua (Hồ tiêu & Cà phê bị giảm ưu tiên)")

    if case['nitrogen (g/kg)'] < 20:
        preds['Coffee'] *= 0.7 # Cà phê thiếu dinh dưỡng sẽ kém
        warnings_list.append("Đất nghèo Nitơ")

    # Chuẩn hóa lại tổng xác suất về 100% sau khi phạt
    total_prob = sum(preds.values())
    preds = {k: (v / total_prob) * 100 for k, v in preds.items()}

    # Sắp xếp kết quả
    sorted_preds = sorted(preds.items(), key=lambda x: x[1], reverse=True)
    
    results_list.append({
        'Khu_Vực': case['ID_Vung'],
        '🌟 Lựa_Chọn_Top_1': f"{sorted_preds[0][0]} ({round(sorted_preds[0][1], 1)}%)",
        '✅ Lựa_Chọn_Top_2': f"{sorted_preds[1][0]} ({round(sorted_preds[1][1], 1)}%)",
        '✅ Lựa_Chọn_Top_3': f"{sorted_preds[2][0]} ({round(sorted_preds[2][1], 1)}%)",
        '⚠️ Tác_Động_Hệ_Chuyên_Gia': " | ".join(warnings_list) if warnings_list else "Môi trường lý tưởng"
    })

output_df = pd.DataFrame(results_list)
print(output_df.to_markdown(index=False))