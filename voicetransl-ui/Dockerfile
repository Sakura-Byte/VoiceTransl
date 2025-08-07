# VoiceTransl UI Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm for faster package management (optional)
RUN npm install -g pnpm

# Copy package files first for better layer caching
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else npm ci; fi

# Copy source code
COPY . .

# Set build arguments for environment configuration
ARG NODE_ENV=production
ARG VITE_API_BASE_URL=/api
ARG VITE_WS_URL=/ws
ARG VITE_APP_TITLE="VoiceTransl"
ARG VITE_APP_VERSION="2.0.0"

# Build the application
RUN if [ -f pnpm-lock.yaml ]; then pnpm run build; else npm run build; fi

# Runtime stage - nginx
FROM nginx:alpine-slim AS runtime

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx user and set permissions
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    chmod -R 755 /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Add labels for better container management
LABEL maintainer="VoiceTransl Team"
LABEL description="VoiceTransl UI - Premium AI translation interface"
LABEL version="2.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]