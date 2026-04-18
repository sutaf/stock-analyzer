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

# Platform injects PORT (Railway, Cloud Run, etc.); fallback to 8080 for local
ENV PORT=8080
EXPOSE 8080

# Wrap in sh -c so ${PORT} is expanded by the shell at container start
# (some platforms don't do env var substitution on multi-line CMD shell form).
# Single worker + threads keeps memory modest; long timeout for Claude reports.
CMD ["sh", "-c", "exec gunicorn --bind :${PORT:-8080} --workers 1 --threads 4 --timeout 300 --worker-class gthread app:app"]
