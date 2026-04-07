FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ .

# Railway injects PORT at runtime; default to 8000 for local use
ENV PORT=8000
# Flush Python output immediately so Railway logs are visible
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
