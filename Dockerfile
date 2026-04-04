# ── Build client ──
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Production ──
FROM node:20-alpine
WORKDIR /app

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source + data + scripts
COPY server/ ./server/
COPY scripts/ ./scripts/

# Download dictionaries
RUN node scripts/setup-dictionary.js

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Server runs with tsx (included in deps)
WORKDIR /app/server
EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
