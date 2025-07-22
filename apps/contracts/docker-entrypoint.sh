#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 TCG Magic Contracts Development Environment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if dependencies are installed
if [ ! -d "lib" ] || [ ! "$(ls -A lib)" ]; then
    echo -e "${YELLOW}⚡ Installing Foundry dependencies...${NC}"
    forge install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
    echo ""
fi

# Display useful information
echo -e "${CYAN}📁 Available commands:${NC}"
echo -e "  ${GREEN}forge build${NC}       - Build contracts"
echo -e "  ${GREEN}forge test${NC}        - Run all tests"
echo -e "  ${GREEN}forge test -vvv${NC}   - Run tests with verbose output"
echo -e "  ${GREEN}npm run test:gas${NC}  - Run tests with gas reporting"
echo -e "  ${GREEN}npm run coverage${NC}  - Generate coverage report"
echo -e "  ${GREEN}npm run dev${NC}       - Watch mode for tests"
echo -e "  ${GREEN}forge clean${NC}       - Clean build artifacts"
echo ""

echo -e "${CYAN}🔧 Deployment commands:${NC}"
echo -e "  ${GREEN}npm run deploy:local${NC}   - Deploy to local network"
echo -e "  ${GREEN}npm run setup:cards${NC}    - Setup card configuration"
echo ""

echo -e "${CYAN}📊 Environment info:${NC}"
echo -e "  📁 Working directory: ${BLUE}$(pwd)${NC}"
echo -e "  🔨 Foundry version: ${BLUE}$(forge --version | head -n1)${NC}"
echo -e "  📦 Node.js version: ${BLUE}$(node --version)${NC}"
echo -e "  🏗️  npm version: ${BLUE}$(npm --version)${NC}"
echo ""

# Check if there are any custom arguments
if [ "$#" -eq 0 ]; then
    echo -e "${YELLOW}💡 Starting interactive shell. Run any command or 'exit' to quit.${NC}"
    echo -e "${YELLOW}💡 Tip: Try 'forge test' to run the test suite!${NC}"
    echo ""
    exec bash
else
    echo -e "${CYAN}🎯 Executing: $@${NC}"
    echo ""
    exec "$@"
fi 