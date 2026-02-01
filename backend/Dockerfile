# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# 1. Install dependencies for shared
# Use wildcard for yarn.lock in case it doesn't exist or we want to be flexible
COPY shared/package.json shared/yarn.lock* ./shared/
RUN cd shared && (yarn install --frozen-lockfile || yarn install)

# 2. Build shared
COPY shared/ ./shared/
RUN cd shared && yarn build && cp -r dist/* .

# 3. Install dependencies for backend
COPY backend/package.json backend/yarn.lock ./backend/
RUN cd backend && yarn install --frozen-lockfile

# 4. Build backend
COPY backend/ ./backend/
RUN cd backend && yarn build

# Production stage
FROM node:20-alpine AS production

# Install libc6-compat also for production
RUN apk add --no-cache libc6-compat

WORKDIR /app/backend

# Copy backend build artifacts and essential config files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json /app/backend/yarn.lock /app/backend/tsconfig.json ./

# Copy shared folder (both source for tsconfig-paths and dist for execution)
COPY --from=builder /app/shared ../shared

# Install production dependencies and clean cache to reduce image size
RUN yarn install --production --frozen-lockfile && yarn cache clean


# Environment variables
ENV NODE_ENV=production
ENV SERVICE_TYPE=ALL
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Start the application
CMD ["node", "-r", "tsconfig-paths/register", "dist/main.js"]

