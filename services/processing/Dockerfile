FROM python:3.12-slim

# OCR + audio tooling. Add tesseract language packs here if you train/obtain
# models for specific African languages (e.g. COPY ssw.traineddata /usr/share/tesseract-ocr/5/tessdata/).
RUN apt-get update \
 && apt-get install -y --no-install-recommends tesseract-ocr ffmpeg fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app

RUN useradd --create-home --uid 10001 swadata
USER swadata
ENV PYTHONUNBUFFERED=1 PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers"]
