# Multi-stage production build for Arzon PV Case Intelligence
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Run test suite and build production assets
RUN npm run build

# Production runner image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create volume mount point for persistent SQLite storage
VOLUME [ "/app/data" ]

EXPOSE 5000

CMD ["npx", "tsx", "server/index.ts"]
