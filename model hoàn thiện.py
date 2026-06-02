import warnings

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, top_k_accuracy_score
from sklearn.model_selection import train_test_split

warnings.filterwarnings("ignore")

file_name = "Vietnam_Crop_Feature_Engineered.csv"
df = pd.read_csv(file_name)


def clean_vietnam_number_format(series):
    return pd.to_numeric(series.astype(str).str.replace(r"\.(?=[^.]*\.)", "", regex=True), errors="coerce")


for col in ["Elevation (m)", "Dry_Season_Deficit (mm)", "Acidification_Risk (index)"]:
    df[col] = clean_vietnam_number_format(df[col])

features = [
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

df_clean = df.dropna(subset=features + ["Crop_Label"])
X = df_clean[features]
y = df_clean["Crop_Label"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

model = RandomForestClassifier(n_estimators=300, max_depth=15, random_state=42)
model.fit(X_train, y_train)
classes = model.classes_

y_pred = model.predict(X_test)
probas = model.predict_proba(X_test)

metrics = {
    "top_1_accuracy": accuracy_score(y_test, y_pred),
    "top_2_accuracy": top_k_accuracy_score(y_test, probas, k=2, labels=classes),
    "top_3_accuracy": top_k_accuracy_score(y_test, probas, k=3, labels=classes),
}

test_cases = [
    {
        "ID_Vung": "Dak_Lak_Dry",
        "Planting_Month (month)": 5,
        "Elevation (m)": 550.0,
        "Temp_Mean (°C)": 24.5,
        "phh2o (pH)": 5.2,
        "nitrogen (g/kg)": 35.0,
        "clay (%)": 35.0,
        "sand (%)": 30.0,
        "silt (%)": 35.0,
        "Dry_Season_Deficit (mm)": 250.0,
        "Acidification_Risk (index)": 2500.0,
        "Rain_Concentration_Index": 0.35,
    },
    {
        "ID_Vung": "Dong_Thap_Acid",
        "Planting_Month (month)": 11,
        "Elevation (m)": 15.0,
        "Temp_Mean (°C)": 28.0,
        "phh2o (pH)": 4.2,
        "nitrogen (g/kg)": 15.0,
        "clay (%)": 45.0,
        "sand (%)": 15.0,
        "silt (%)": 40.0,
        "Dry_Season_Deficit (mm)": 100.0,
        "Acidification_Risk (index)": 4000.0,
        "Rain_Concentration_Index": 0.85,
    },
]


def apply_soft_penalty(case, predictions):
    warnings_list = []

    if case["Dry_Season_Deficit (mm)"] > 200:
        predictions["Rice"] *= 0.3
        predictions["Maize"] *= 0.8
        warnings_list.append("dry_season_deficit")

    if case["Acidification_Risk (index)"] > 3000 or case["phh2o (pH)"] < 4.5:
        predictions["Pepper"] *= 0.4
        predictions["Coffee"] *= 0.5
        predictions["Rubber"] *= 1.1
        warnings_list.append("acidification_risk")

    if case["nitrogen (g/kg)"] < 20:
        predictions["Coffee"] *= 0.7
        warnings_list.append("low_nitrogen")

    total_prob = sum(predictions.values())
    predictions = {key: (value / total_prob) * 100 for key, value in predictions.items()}
    return predictions, warnings_list


results_list = []
for case in test_cases:
    case_input = {key: case[key] for key in features}
    case_df = pd.DataFrame([case_input])
    raw_probas = model.predict_proba(case_df)[0]
    predictions = {classes[index]: raw_probas[index] * 100 for index in range(len(classes))}
    predictions, warnings_list = apply_soft_penalty(case, predictions)
    sorted_predictions = sorted(predictions.items(), key=lambda item: item[1], reverse=True)
    results_list.append(
        {
            "case": case["ID_Vung"],
            "top_1": sorted_predictions[0][0],
            "top_1_percent": round(sorted_predictions[0][1], 1),
            "top_2": sorted_predictions[1][0],
            "top_2_percent": round(sorted_predictions[1][1], 1),
            "top_3": sorted_predictions[2][0],
            "top_3_percent": round(sorted_predictions[2][1], 1),
            "warnings": warnings_list,
        }
    )

output_df = pd.DataFrame(results_list)
print(metrics)
print(output_df.to_markdown(index=False))
