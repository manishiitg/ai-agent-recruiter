# Use the official Node.js image as the base image
FROM node:21

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install poppler-utils for pdftotext
RUN apt-get update && \
    apt-get install -y build-essential libpoppler-cpp-dev pkg-config python3-dev poppler-utils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*


# Copy package.json and package-lock.json (if available)
COPY package*.json ./
# Install Node.js dependencies
RUN yarn

COPY .env ./

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["npm", "run", "server"]