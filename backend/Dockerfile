# We gebruiken een lichte, officiële Python image
FROM python:3.9-slim

# We maken een werkmap aan in de container
WORKDIR /app

# Kopieer eerst de requirements en installeer ze
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopieer daarna de rest van je code
COPY . .

# Vertel Docker welk commando hij moet uitvoeren als de container start
CMD ["python", "app.py"]