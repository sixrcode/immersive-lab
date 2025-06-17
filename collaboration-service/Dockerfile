# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install --only=production

# Copy the rest of the application code to the working directory
COPY . .

# Build the TypeScript code
RUN npm install -g typescript
RUN tsc

# Make port 3001 available to the world outside this container
# The EXPOSE instruction does not actually publish the port. It functions as a type of documentation between the person who builds the image and the person who runs the container, about which ports are intended to be published.
# To actually publish the port when running the container, use the -p flag on `docker run` or Cloud Run's port configuration.
EXPOSE 3001

# Define environment variable for the application to use
ENV NODE_ENV production
ENV PORT 3001

# Run index.js when the container launches
CMD ["node", "dist/index.js"]
