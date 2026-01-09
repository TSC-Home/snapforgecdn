# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install build dependencies for sharp
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# Production stage
FROM node:22-alpine AS production

# Install runtime dependencies for sharp
RUN apk add --no-cache vips

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sveltekit -u 1001

# Copy built application
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./

# Create data directories
RUN mkdir -p /app/data/uploads && \
    chown -R sveltekit:nodejs /app/data

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV ORIGIN=http://localhost:3000
ENV DATABASE_URL=file:/app/data/snapforge.db
ENV STORAGE_PATH=/app/data/uploads

# Switch to non-root user
USER sveltekit

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "build"]
