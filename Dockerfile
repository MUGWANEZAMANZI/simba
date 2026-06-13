FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update -qq && apt-get install -y -qq python3 make g++ curl

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update -qq && apt-get install -y -qq python3 make g++ curl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server ./server
COPY simba_products.json ./simba_products.json

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

VOLUME /app/server/data

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8787/api/health || exit 1

CMD ["node", "server/index.js"]
