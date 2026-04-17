FROM python:3.11-slim

# System deps required by curl_cffi and numpy/pandas wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application
COPY . .

# Cloud Run injects PORT; default to 8080 for local runs
ENV PORT=8080
EXPOSE 8080

# Single worker + threads (keeps memory modest even on 1GB instance).
# Longer timeout to accommodate Claude Opus 4.7 reports with web_search.
CMD exec gunicorn \
    --bind :$PORT \
    --workers 1 \
    --threads 4 \
    --timeout 300 \
    --worker-class gthread \
    app:app
