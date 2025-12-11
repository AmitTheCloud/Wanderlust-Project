# Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json / package-lock.json first for caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Build (if you have build steps; remove if not needed)
# RUN npm run build

# Expose port used in app
EXPOSE 3000

# Set env defaults (can be overridden in k8s manifest)
ENV PORT=3000
ENV NODE_ENV=production

# Start the app
CMD ["node", "app.js"]