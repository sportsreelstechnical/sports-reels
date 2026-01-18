FROM node:20-alpine

WORKDIR /app

# Install dependencies for backend only
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build the server
RUN npx tsc -p server/tsconfig.json
# We use tsx to run the build script directly if needed.
RUN npx tsx script/build-server.ts

# Cleanup dev dependencies to keep image small
RUN npm prune --production

# Expose port
ENV PORT=5000
EXPOSE 5000

# Start command
CMD ["node", "dist/index.cjs"]
