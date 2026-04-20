FROM node:20-bookworm-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
  chromium \
  libnspr4 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpango-1.0-0 \
  libcairo2 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxext6 \
  libxshmfence1 \
  libglib2.0-0 \
  libnss3-dev \
  libdbus-1-3 \
  fonts-liberation \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Tell Remotion where Chrome is
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium
ENV DISPLAY=:99
ENV REMOTION_GL=angle

EXPOSE 8080

CMD ["node", "agent.js"]