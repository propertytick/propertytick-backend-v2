# Node.js ka official image use karein
FROM node:20-slim

# Chromium aur uske dependencies install karein
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer ko batayein ki wo system Chromium use kare, apna download na kare
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# App ka working directory set karein
WORKDIR /app

# Package files copy karein aur dependencies install karein
COPY package*.json ./
RUN npm install

# Baaki saara code copy karein
COPY . .

# Port expose karein (Render PORT env var use karega)
EXPOSE 10000

# Server start karein
CMD ["node", "src/server.js"]