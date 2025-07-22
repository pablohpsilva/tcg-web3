# Use Ubuntu as base image for better compatibility
FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18.x
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/root/.foundry/bin:${PATH}"
RUN foundryup

# Set working directory
WORKDIR /workspace

# Copy package.json first for better Docker layer caching
COPY package.json ./

# Install npm dependencies if any
RUN npm install

# Copy foundry configuration
COPY foundry.toml ./

# Copy git configuration for submodules
COPY .gitmodules ./

# Initialize git repository and install Foundry dependencies
RUN git init . \
    && git add . \
    && git config user.email "docker@tcg-magic.dev" \
    && git config user.name "Docker Dev" \
    && forge install

# Copy source files
COPY src/ ./src/
COPY test/ ./test/
COPY script/ ./script/
COPY README.md ./
COPY EMISSION_MECHANICS.md ./

# Expose port for potential local blockchain
EXPOSE 8545

# Set up environment variables
ENV FOUNDRY_PROFILE=default
ENV FOUNDRY_SRC=src
ENV FOUNDRY_OUT=out
ENV FOUNDRY_LIBS=lib
ENV FOUNDRY_CACHE_PATH=/workspace/cache

# Create a script for common development tasks
RUN echo '#!/bin/bash\n\
echo "🚀 TCG Magic Contracts Development Environment"\n\
echo "📁 Available commands:"\n\
echo "  forge build       - Build contracts"\n\
echo "  forge test        - Run tests"\n\
echo "  forge test -vvv   - Run tests with verbose output"\n\
echo "  npm run test:gas  - Run tests with gas reporting"\n\
echo "  npm run coverage  - Generate coverage report"\n\
echo "  npm run dev       - Watch mode for tests"\n\
echo "  forge clean       - Clean build artifacts"\n\
echo ""\n\
echo "🔧 Current working directory: $(pwd)"\n\
echo "📊 Foundry version: $(forge --version)"\n\
echo "📦 Node.js version: $(node --version)"\n\
echo ""\n\
if [ "$#" -eq 0 ]; then\n\
    echo "💡 Run specific commands or start an interactive shell"\n\
    exec bash\n\
else\n\
    exec "$@"\n\
fi' > /entrypoint.sh && chmod +x /entrypoint.sh

# Default command
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"] 