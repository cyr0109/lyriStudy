# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Final Image (Python + Nginx)
FROM python:3.11-slim

# Install Nginx
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Set working directory for backend
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy frontend build artifacts from Stage 1
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Configure Nginx
# Remove default config
RUN rm -rf /etc/nginx/sites-enabled/default
# Copy our custom config (ensure nginx.prod.conf is in root context)
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

# Add entrypoint script
COPY entrypoint.sh /entrypoint.sh
# Install dos2unix and convert script to Unix format (LF)
RUN apt-get update && apt-get install -y dos2unix && dos2unix /entrypoint.sh && rm -rf /var/lib/apt/lists/*
RUN chmod +x /entrypoint.sh

# Expose port 80 (Zeabur uses this)
EXPOSE 80

# Start script
CMD ["/entrypoint.sh"]
