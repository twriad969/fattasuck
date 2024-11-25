# Use Node.js 18 as the base image
FROM node:18-slim

# Install system dependencies for sharp
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start the bot
CMD ["node", "index.js"]
