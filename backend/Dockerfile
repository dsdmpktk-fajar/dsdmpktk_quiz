FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Pastikan setuptools, pip, wheel terbaru
RUN pip install --upgrade pip setuptools wheel

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./src /app

CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]
