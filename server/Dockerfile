# Build stage
FROM debian:stable-slim AS build-stage

ARG BUILD_DATE
ARG VERSION
ARG TEEMII_VERSION

LABEL build_version="dokkaner.io version:- ${VERSION} Build-date:- ${BUILD_DATE}"
LABEL maintainer="dokkaner"

# Set build-time environment variables
ENV EXPRESS_PORT=3000
ENV SOCKET_IO_PORT=1555
ENV NODE_VERSION=node_20.x
ENV NODE_KEYRING=/usr/share/keyrings/nodesource.gpg
ENV DISTRIBUTION=bookworm

# Install Node.js
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Add Node.js repository
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | gpg --dearmor | tee "$NODE_KEYRING" >/dev/null && \
    echo "deb [signed-by=$NODE_KEYRING] https://deb.nodesource.com/$NODE_VERSION $DISTRIBUTION main" | tee /etc/apt/sources.list.d/nodesource.list

# Install dependencies
RUN apt-get update && \
   DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends \
    nodejs \
    python3 \
    make \
    g++ \
    libatomic1 \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    unzip \
    xdg-utils \
    imagemagick \
    libvulkan1 && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    mkdir -p /root/db

# URL waifu2x-ncnn-vulkan
ENV WAIFU2X_URL=https://github.com/nihui/waifu2x-ncnn-vulkan/releases/download/20220728/waifu2x-ncnn-vulkan-20220728-ubuntu.zip

RUN DEBIAN_FRONTEND=noninteractive && \
    wget "$WAIFU2X_URL" -O waifu2x-ncnn-vulkan.zip && \
    unzip waifu2x-ncnn-vulkan.zip -d waifu2x-ncnn-vulkan && \
    mv waifu2x-ncnn-vulkan/waifu2x-ncnn-vulkan-20220728-ubuntu /usr/local/bin/ && \
    rm -rf waifu2x-ncnn-vulkan waifu2x-ncnn-vulkan.zip

# test waifu2x-ncnn-vulkan
# RUN /usr/local/bin/waifu2x-ncnn-vulkan-20220728-ubuntu/waifu2x-ncnn-vulkan -h

# test imagemagick
# RUN convert -version

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install pm2 -g

# Copy all files
COPY . .

# Expose ports
EXPOSE 3000

USER $user

# Launch server
CMD ["pm2-runtime", "start", "server.js"]
