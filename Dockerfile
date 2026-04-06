FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ .

# Railway injects PORT at runtime; default to 8000 for local use
ENV PORT=8000

EXPOSE 8000

CMD uvicorn server:app --host 0.0.0.0 --port ${PORT}
