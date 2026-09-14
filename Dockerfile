# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build backend and frontend
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

COPY package*.json ./
COPY server/package*.json ./server/
RUN cd server && npm install --only=production

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/public

EXPOSE 5001

CMD ["node", "server/dist/index.js"]
