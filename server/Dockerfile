# Simple, no-local-node required build
FROM node:20-slim

# Run as non-root for safety
USER node
WORKDIR /app

# Create package.json inside the image
RUN npm init -y \
 && npm pkg set name="pomodoro-api" version="1.0.0" type=module main=server.js \
 && npm pkg set scripts.start="node server.js"

# Install only the few runtime deps you need
RUN npm install express cors

# Copy your app in
COPY --chown=node:node server.js .

EXPOSE 3000
CMD ["npm", "start"]