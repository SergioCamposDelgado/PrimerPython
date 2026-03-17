FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Añadimos el directorio actual al path de Python
ENV PYTHONPATH=/app

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Asegúrate de que en main.py exista la variable "app"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]