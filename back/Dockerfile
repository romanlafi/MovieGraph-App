FROM python:3.11-slim

# Instalar dependencias necesarias para compilar binarios Python y conectarse a PostgreSQL
RUN apt-get update && \
    apt-get install -y gcc libpq-dev python3-dev musl-dev && \
    rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar e instalar dependencias
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código
COPY . .

# Exponer el puerto en el que corre FastAPI
EXPOSE 8001

# Ejecutar la app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
