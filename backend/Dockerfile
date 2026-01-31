# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy shared and build it
COPY shared ./shared
RUN cd shared && yarn install && yarn build

# Copy backend and build it
COPY backend ./backend
RUN cd backend && yarn install && yarn build

# Production stage
FROM node:20-alpine AS production

# Install libc6-compat also for production just in case some native deps need it
RUN apk add --no-cache libc6-compat

WORKDIR /app/backend

# Copy backend build artifacts
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json /app/backend/yarn.lock /app/backend/tsconfig.json ./

# Copy shared folder (both source for tsconfig-paths and dist for execution)
# We copy everything from shared to avoid path resolution issues
COPY --from=builder /app/shared ../shared

# Move built shared files to the base of shared so they match the imports
# e.g. @shared/index.js -> /app/shared/index.js
RUN cp -r ../shared/dist/* ../shared/ && rm -rf ../shared/dist

# Install production dependencies
RUN yarn install --production --frozen-lockfile

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
