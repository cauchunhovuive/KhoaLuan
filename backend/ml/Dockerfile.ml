FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

# Cài PyTorch CPU trước (image nhẹ, không kéo CUDA) — cần cho LightGCN-CF (Li & Zhang 2025)
# Dòng `torch>=2.0` trong requirements.txt sẽ được pip bỏ qua vì đã cài xong.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Run the main API (clustering module with new CF + session + evaluation routes included)
CMD ["uvicorn", "clustering.api:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
