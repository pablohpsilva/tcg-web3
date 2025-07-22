#!/bin/bash

# TCG Magic Contracts - Docker Development Helper Script
# This script provides easy commands for Docker-based development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${PURPLE}🚀 TCG Magic Contracts - Docker Development${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_usage() {
    echo -e "${CYAN}Usage: ./dev.sh <command>${NC}\n"
    echo -e "${YELLOW}Available commands:${NC}"
    echo -e "  ${GREEN}start${NC}         - Start development environment"
    echo -e "  ${GREEN}shell${NC}         - Open interactive shell in container"
    echo -e "  ${GREEN}test${NC}          - Run all tests"
    echo -e "  ${GREEN}test-verbose${NC}  - Run tests with verbose output"
    echo -e "  ${GREEN}test-gas${NC}      - Run tests with gas reporting"
    echo -e "  ${GREEN}build${NC}         - Build contracts"
    echo -e "  ${GREEN}clean${NC}         - Clean build artifacts"
    echo -e "  ${GREEN}coverage${NC}      - Generate coverage report"
    echo -e "  ${GREEN}dev${NC}           - Start watch mode for tests"
    echo -e "  ${GREEN}blockchain${NC}    - Start local blockchain (Anvil)"
    echo -e "  ${GREEN}deploy-local${NC}  - Deploy to local blockchain"
    echo -e "  ${GREEN}setup${NC}         - Setup card configuration"
    echo -e "  ${GREEN}stop${NC}          - Stop all containers"
    echo -e "  ${GREEN}restart${NC}       - Restart development environment"
    echo -e "  ${GREEN}logs${NC}          - Show container logs"
    echo -e "  ${GREEN}reset${NC}         - Reset everything (rebuild from scratch)"
    echo -e "  ${GREEN}status${NC}        - Show container status"
    echo ""
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker Desktop.${NC}"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
        exit 1
    fi
}

check_compose() {
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ docker-compose is not installed.${NC}"
        exit 1
    fi
}

ensure_container_running() {
    if ! docker-compose ps contracts-dev | grep -q "Up"; then
        echo -e "${YELLOW}⚡ Starting development container...${NC}"
        docker-compose up -d contracts-dev
        echo -e "${GREEN}✅ Container started${NC}"
    fi
}

# Main script
main() {
    print_header

    if [ $# -eq 0 ]; then
        print_usage
        exit 1
    fi

    check_docker
    check_compose

    case $1 in
        "start")
            echo -e "${YELLOW}🚀 Starting development environment...${NC}"
            docker-compose up -d contracts-dev
            echo -e "${GREEN}✅ Development environment started!${NC}"
            echo -e "${CYAN}💡 Run './dev.sh shell' to enter the container${NC}"
            ;;

        "shell")
            ensure_container_running
            echo -e "${CYAN}🐚 Opening interactive shell...${NC}"
            docker-compose exec contracts-dev bash
            ;;

        "test")
            ensure_container_running
            echo -e "${CYAN}🧪 Running tests...${NC}"
            docker-compose exec contracts-dev forge test
            ;;

        "test-verbose")
            ensure_container_running
            echo -e "${CYAN}🧪 Running tests with verbose output...${NC}"
            docker-compose exec contracts-dev forge test -vvv
            ;;

        "test-gas")
            ensure_container_running
            echo -e "${CYAN}⛽ Running tests with gas reporting...${NC}"
            docker-compose exec contracts-dev npm run test:gas
            ;;

        "build")
            ensure_container_running
            echo -e "${CYAN}🔨 Building contracts...${NC}"
            docker-compose exec contracts-dev forge build
            ;;

        "clean")
            ensure_container_running
            echo -e "${CYAN}🧹 Cleaning build artifacts...${NC}"
            docker-compose exec contracts-dev forge clean
            ;;

        "coverage")
            ensure_container_running
            echo -e "${CYAN}📊 Generating coverage report...${NC}"
            docker-compose exec contracts-dev npm run coverage
            ;;

        "dev")
            ensure_container_running
            echo -e "${CYAN}👀 Starting watch mode for tests...${NC}"
            echo -e "${YELLOW}💡 Press Ctrl+C to stop watching${NC}"
            docker-compose exec contracts-dev npm run dev
            ;;

        "blockchain")
            echo -e "${CYAN}⛓️  Starting local blockchain (Anvil)...${NC}"
            docker-compose --profile blockchain up -d anvil
            echo -e "${GREEN}✅ Local blockchain started on port 8546${NC}"
            echo -e "${CYAN}💡 Connect to: http://localhost:8546${NC}"
            ;;

        "deploy-local")
            ensure_container_running
            echo -e "${CYAN}🚀 Deploying to local blockchain...${NC}"
            docker-compose exec contracts-dev bash -c "
                export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
                export RPC_URL=http://anvil:8545
                npm run deploy:local
            "
            ;;

        "setup")
            ensure_container_running
            echo -e "${CYAN}⚙️  Setting up card configuration...${NC}"
            docker-compose exec contracts-dev npm run setup:cards
            ;;

        "stop")
            echo -e "${YELLOW}🛑 Stopping all containers...${NC}"
            docker-compose down
            echo -e "${GREEN}✅ All containers stopped${NC}"
            ;;

        "restart")
            echo -e "${YELLOW}🔄 Restarting development environment...${NC}"
            docker-compose restart contracts-dev
            echo -e "${GREEN}✅ Development environment restarted${NC}"
            ;;

        "logs")
            echo -e "${CYAN}📋 Showing container logs...${NC}"
            docker-compose logs -f contracts-dev
            ;;

        "reset")
            echo -e "${RED}⚠️  This will reset everything and rebuild from scratch!${NC}"
            read -p "Are you sure? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${YELLOW}🔄 Resetting everything...${NC}"
                docker-compose down -v --rmi local
                docker-compose build --no-cache contracts-dev
                docker-compose up -d contracts-dev
                echo -e "${GREEN}✅ Reset complete!${NC}"
            else
                echo -e "${CYAN}❌ Reset cancelled${NC}"
            fi
            ;;

        "status")
            echo -e "${CYAN}📊 Container status:${NC}"
            docker-compose ps
            echo ""
            if docker-compose ps contracts-dev | grep -q "Up"; then
                echo -e "${GREEN}✅ Development environment is running${NC}"
            else
                echo -e "${YELLOW}⚠️  Development environment is not running${NC}"
                echo -e "${CYAN}💡 Run './dev.sh start' to start it${NC}"
            fi
            ;;

        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 