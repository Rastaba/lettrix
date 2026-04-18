# ── Build client ──
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Build server ──
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx tsc

# ── Production ──
FROM node:20-alpine
WORKDIR /app

# Install server production deps only
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy compiled server JS
COPY --from=server-build /app/server/dist ./server/dist

# Copy server data directory
COPY server/data/ ./server/data/

# Download dictionaries
COPY scripts/ ./scripts/
RUN node scripts/setup-dictionary.js

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 3001

CMD ["node", "dist/index.js"]
