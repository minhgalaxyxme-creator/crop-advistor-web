# Crop Advisor Web

Web demo tư vấn cây trồng tiếng Việt dựa trên bộ dữ liệu `Vietnam_Crop_Feature_Engineered.csv` và feature set của model Random Forest trong `model hoàn thiện.py`.

## Tính năng

- Nhập 10 đặc trưng của model để xếp hạng cây trồng phù hợp.
- Tải metadata và kết quả gợi ý qua Flask API.
- Áp dụng soft penalty cho các trường hợp khô hạn, đất chua/phèn và thiếu Nitơ.
- Có 2 mẫu nhập nhanh: **Mẫu đất phèn** và **Mẫu khô hạn**.
- Có chatbot Gemini tùy chọn nếu cấu hình `GEMINI_API_KEY`.

## Cấu trúc chính

| File | Mục đích |
| --- | --- |
| `index.html` | Giao diện nhập liệu và hiển thị kết quả |
| `app.js` | Logic frontend, gọi API, render kết quả và chatbot |
| `styles.css` | Giao diện và hiệu ứng chọn mẫu |
| `server.py` | Flask server, API metadata/recommend/chat |
| `Vietnam_Crop_Feature_Engineered.csv` | Dataset đã feature-engineered |
| `model hoàn thiện.py` | Script huấn luyện/evaluate model |
| `requirements.txt` | Thư viện Python cần cài |

## Cách chạy trên Windows CMD

Nếu folder của bạn là:

```cmd
C:\Users\ASUS\Downloads\crop-advistor-web-main
```

Chạy các lệnh sau:

```cmd
cd /d "C:\Users\ASUS\Downloads\crop-advistor-web-main"
python -m pip install -r requirements.txt
python server.py
```

Nếu máy dùng Python launcher `py`:

```cmd
cd /d "C:\Users\ASUS\Downloads\crop-advistor-web-main"
py -m pip install -r requirements.txt
py server.py
```

Sau đó mở trình duyệt tại:

```text
http://127.0.0.1:5000
```

## Bật chatbot Gemini

Phần gợi ý cây trồng không cần Gemini key. Nếu muốn dùng chatbot Gemini, đặt biến môi trường trước khi chạy server:

```cmd
set GEMINI_API_KEY=YOUR_API_KEY_HERE
python server.py
```

Có thể đổi model Gemini bằng biến môi trường:

```cmd
set GEMINI_MODEL=gemini-2.5-flash
python server.py
```

## Chạy script model

Nếu đã chạy `python -m pip install -r requirements.txt` ở bước trên thì đã có đủ thư viện để chạy script:

Chạy script:

```cmd
python "model hoàn thiện.py"
```

## Lưu ý

- Không mở trực tiếp `index.html` nếu muốn dùng dữ liệu/model mới đầy đủ, vì frontend cần gọi Flask API.
- Hãy giữ `Vietnam_Crop_Feature_Engineered.csv` cùng thư mục với `server.py`.
- Nếu port `5000` bận, có thể chạy bằng port khác:

```cmd
set PORT=8000
python server.py
```

Rồi mở:

```text
http://127.0.0.1:8000
```
