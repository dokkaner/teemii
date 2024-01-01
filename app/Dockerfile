# Build stage
FROM node:20.9 AS build-stage

ARG BUILD_DATE
ARG VERSION
ARG TEEMII_VERSION
LABEL build_version="dokkaner.io version:- ${VERSION} Build-date:- ${BUILD_DATE}"
LABEL maintainer="dokkaner"

# Set build-time environment variables
ENV VITE_APP_TITLE=Teemii
ENV VITE_APP_PORT=80

WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

# install dependencies
RUN npm install --ignore-scripts

# Copy all files
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production-stage

# Copy built content from the build stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# start nginx
CMD ["nginx", "-g", "daemon off;"]
