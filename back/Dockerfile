FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar psycopg2-binary
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copiar el resto de la app
COPY . .

ENV PYTHONPATH=/app

CMD ["sh", "-c", "python resources/create_tables.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]