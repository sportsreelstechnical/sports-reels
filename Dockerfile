FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY client/package.json client/
# Only install production dependencies for now to save space, but we need devDependencies for build
# So we install all, build, then prune
RUN npm install

# Copy source
COPY . .

# Build only the server
RUN npx tsc -p tsconfig.server.json
# We use tsx to run the build script directly if needed, but we should add a script to package.json
# For now, let's use npx tsx
RUN npx tsx script/build-server.ts

# Cleanup dev dependencies to keep image small
RUN npm prune --production

# Expose port
ENV PORT=5000
EXPOSE 5000

# Start command
CMD ["node", "dist/index.cjs"]
