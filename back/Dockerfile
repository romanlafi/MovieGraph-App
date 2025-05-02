FROM python:3.11-slim

# Instalar dependencias necesarias para compilar y trabajar con PostgreSQL
RUN apt-get update && \
    apt-get install -y gcc libpq-dev python3-dev build-essential && \
    rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 8001

# Comando por defecto
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
