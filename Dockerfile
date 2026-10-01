# ==============================================================================
# Multi-Stage Dockerfile for Google Cloud Run / Render
# Optimized for Node.js 22 LTS, security, and low memory footprint
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets & Backend Bundle
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for compiling
COPY package*.json ./
RUN npm ci

# Copy full application source code
COPY . .

# Build Vite frontend assets and esbuild standalone server bundle
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Execution Container
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy production build
COPY --from=builder /app/dist ./dist

# Copy Drizzle configuration and database schema
COPY --from=builder /app/src/db/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/db/schema.ts ./src/db/schema.ts

# Harden security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

USER appuser

# Expose container port
EXPOSE 8080

# Push database schema first, then start the API server
CMD ["sh", "-c", "npm run db:push && node dist/server.mjs"]