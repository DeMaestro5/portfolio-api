# Base image
FROM node:20.10.0

# Create app dir and set ownership
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app

# Use non-root user for installs and runtime
USER node

# Install dependencies first (leverage Docker layer cache)
COPY --chown=node:node package*.json ./
RUN npm ci

# Copy the rest of the source
COPY --chown=node:node . .

# Build TypeScript during image build (not at runtime)
RUN npm run build

# Runtime environment and memory cap (stay under Render Starter 512Mi)
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=400"

# Expose application port
EXPOSE 3000

# Run the compiled server directly
CMD [ "node", "-r", "dotenv/config", "build/server.js" ]