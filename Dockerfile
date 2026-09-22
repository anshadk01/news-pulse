# Multi-language container with Node.js 20 & Python 3.11
FROM node:20-bookworm-slim

# Install Python 3, pip, and essential build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    gcc \
    g++ \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup Python Virtual Environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHON_BIN="/opt/venv/bin/python3"
ENV PYTHONUNBUFFERED=1

# Copy Scraper requirements and install
COPY scraper/requirements.txt ./scraper/requirements.txt
RUN pip install --no-cache-dir -r scraper/requirements.txt psycopg2-binary python-dotenv

# Copy Backend package.json and install
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy entire application source
WORKDIR /app
COPY scraper/ ./scraper/
COPY backend/ ./backend/

WORKDIR /app/backend

ENV NODE_ENV=production

EXPOSE 5000 10000

CMD ["node", "src/server.js"]
