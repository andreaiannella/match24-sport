# Match Sport 24 backend - production image
FROM python:3.11-slim

WORKDIR /app

# System deps needed to build some Python packages (cryptography, bcrypt, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (better layer caching: only reinstalls
# when requirements.txt actually changes, not on every code edit)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Most PaaS platforms (Railway, Render, Fly.io) inject the port to bind via
# the PORT env var and expect the app to read it - default to 8000 locally.
ENV PORT=8000
EXPOSE 8000

# Single command that works everywhere: read $PORT at runtime via a shell wrapper,
# since Docker's exec-form CMD does not expand environment variables.
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
