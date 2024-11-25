# Use Node.js LTS version
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .

# Define environment variable
ENV NODE_ENV=production

# Start the bot
CMD [ "npm", "start" ]
