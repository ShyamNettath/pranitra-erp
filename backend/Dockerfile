FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S pranitra && adduser -S pranitra -G pranitra
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/uploads && chown -R pranitra:pranitra /app
USER pranitra
EXPOSE 4000
CMD ["node", "src/server.js"]
