FROM node:22-bookworm-slim

# Install system dependencies for @napi-rs/canvas, OCR, and font rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fontconfig \
    fonts-dejavu-core \
    libpixman-1-0 \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Expose default port (Railway dynamically injects PORT)
ENV PORT=8090
EXPOSE 8090

CMD ["npm", "start"]
