# Use an official Node runtime as a parent image
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 5173 (Vite default)
EXPOSE 5173

# Start the app in development mode
CMD ["npm", "run", "dev", "--", "--host"]
