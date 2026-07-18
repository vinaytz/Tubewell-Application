FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Environment variables
ENV PORT=3000
ENV DATABASE_PATH=/usr/src/app/data/db.json

# Expose server port
EXPOSE 3000

# Start server
CMD [ "npm", "start" ]
