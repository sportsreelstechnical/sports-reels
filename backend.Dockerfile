# -----------------------------
# Stage 1: Build Stage
# -----------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install native compilation dependencies for argon2 / node-gyp
RUN apk add --no-cache python3 make gcc g++

# Install all dependencies (including devDependencies needed for TypeScript & build scripts)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build steps
RUN npx tsc -p server/tsconfig.json
RUN npx tsx script/build-server.ts

# Prune devDependencies leaving only production runtime packages
RUN npm prune --production

# -----------------------------
# Stage 2: Production Runner
# -----------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy compiled files and production node_modules from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Railway injects $PORT dynamically; default fallback to 5000 for local runs
ENV PORT=5000
EXPOSE ${PORT}

# Run the compiled server
CMD ["node", "dist/index.cjs"]