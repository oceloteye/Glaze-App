# ---- Build stage ----
FROM node:lts-alpine AS builder
WORKDIR /app

# Install dependencies — cached unless package-lock.json changes
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM nginx:alpine AS runtime

# Remove default static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config template — BACKEND_HOST is substituted at container start
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

# BACKEND_HOST — hostname of the backend service.
# Default: "backend" (matches typical Docker / Kubernetes service name).
# Override at runtime: -e BACKEND_HOST=my-backend-service
ENV BACKEND_HOST=backend
