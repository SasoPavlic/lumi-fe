# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.14.0
ARG NGINX_VERSION=1.27-alpine
ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_BASE_PATH=/

FROM node:${NODE_VERSION} AS build

WORKDIR /app

# Install dependencies first for better caching.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build the production bundle.
COPY . .
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN npm run build

FROM nginx:${NGINX_VERSION} AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

# Use the default NGINX config; override via volume if needed.
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
