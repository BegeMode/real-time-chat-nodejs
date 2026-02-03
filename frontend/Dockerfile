# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# 1. Install dependencies for shared
COPY shared/package.json shared/yarn.lock* ./shared/
RUN cd shared && (yarn install --frozen-lockfile || yarn install)

# 2. Build shared
COPY shared/ ./shared/
RUN cd shared && yarn build && cp -r dist/* .

# 3. Install dependencies for frontend
COPY frontend/package.json frontend/yarn.lock ./frontend/
RUN cd frontend && yarn install --frozen-lockfile

# 4. Build frontend
COPY frontend/ ./frontend/

# Pass environment variables for build time (Vite needs them)
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN cd frontend && yarn build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app/frontend

# Copy built app
COPY --from=builder /app/frontend/build ./build
COPY --from=builder /app/frontend/package.json ./
COPY --from=builder /app/shared ../shared

# Install production dependencies
# We need to install them because adapter-node build might depend on them 
# unless everything is bundled. (Default adapter-node doesn't bundle everything)
RUN yarn install --production --frozen-lockfile && yarn cache clean

ENV NODE_ENV=production
ENV PORT=5173

EXPOSE 5173

# Start the application
CMD ["node", "build/index.js"]
