# Docker Development Environment for TCG Magic Contracts

This Docker setup provides a complete development environment for the TCG Magic smart contracts, specifically designed to solve Windows compatibility issues with Foundry and ensure consistent development across all platforms.

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Git](https://git-scm.com/downloads) installed

### 1. Clone and Navigate

```bash
git clone <your-repo-url>
cd tcg-magic/apps/contracts
```

### 2. Build and Start Development Environment

#### Option A: Using npm scripts (recommended)

```bash
# Start the development environment
npm run docker:start

# Enter the interactive shell
npm run docker:shell
```

#### Option B: Using docker-compose directly

```bash
# Build the Docker image and start the development container
docker-compose up -d contracts-dev

# Enter the interactive development environment
docker-compose exec contracts-dev bash
```

### 3. Verify Setup

Once inside the container, you should see:

```
🚀 TCG Magic Contracts Development Environment
================================================

📁 Available commands:
  forge build       - Build contracts
  forge test        - Run all tests
  forge test -vvv   - Run tests with verbose output
  npm run test:gas  - Run tests with gas reporting
  npm run coverage  - Generate coverage report
  npm run dev       - Watch mode for tests
  forge clean       - Clean build artifacts

🔧 Deployment commands:
  npm run deploy:local   - Deploy to local network
  npm run setup:cards    - Setup card configuration

📊 Environment info:
  📁 Working directory: /workspace
  🔨 Foundry version: forge 0.2.0
  📦 Node.js version: v18.x.x
  🏗️  npm version: 9.x.x

💡 Starting interactive shell. Run any command or 'exit' to quit.
💡 Tip: Try 'forge test' to run the test suite!
```

## 🛠️ Development Workflow

### Using npm Docker Scripts (recommended for Windows developers)

```bash
# Start the development environment
npm run docker:start

# Run all tests
npm run docker:test

# Run with verbose output to see detailed information
npm run docker:test:verbose

# Run tests with gas reporting
npm run docker:test:gas

# Build all contracts
npm run docker:build:contracts

# Start watch mode - automatically re-run tests when files change
npm run docker:dev

# Generate coverage report
npm run docker:coverage

# Clean build artifacts
npm run docker:clean
```

### Local Deployment with Docker

```bash
# Start local blockchain
npm run docker:blockchain

# Deploy contracts to local network (includes setup with test private key)
npm run docker:deploy:local

# Setup card configuration
npm run docker:setup
```

### Traditional Commands (inside container)

```bash
# First enter the container
npm run docker:shell

# Then run traditional commands
forge test
forge test -vvv
npm run test:gas
npm run dev
forge build
forge clean
npm run coverage
```

## 🔧 Advanced Usage

### One-off Commands

You can run single commands without entering the interactive shell:

```bash
# Run tests directly
docker-compose exec contracts-dev forge test

# Build contracts
docker-compose exec contracts-dev forge build

# Check contract size
docker-compose exec contracts-dev forge build --sizes
```

### With Local Blockchain

Start a local Ethereum node for testing:

```bash
# Start both the development environment and local blockchain
docker-compose --profile blockchain up -d

# The local blockchain will be available at:
# - From host: http://localhost:8546
# - From contracts container: http://anvil:8545
```

### Custom Scripts

Run deployment scripts:

```bash
# Inside the container
docker-compose exec contracts-dev bash

# Set up environment variables
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export RPC_URL=http://anvil:8545

# Deploy contracts
npm run deploy:local
```

## 📁 File Structure & Mounting

The Docker setup mounts your local files for live development:

```
apps/contracts/
├── src/                    # ✅ Live mounted - edit locally
├── test/                   # ✅ Live mounted - edit locally
├── script/                 # ✅ Live mounted - edit locally
├── foundry.toml           # ✅ Live mounted
├── package.json           # ✅ Live mounted
├── out/                   # 🔄 Docker volume (build artifacts)
├── cache/                 # 🔄 Docker volume (cache)
├── lib/                   # 🔄 Docker volume (dependencies)
└── node_modules/          # 🔄 Docker volume (npm deps)
```

**Key Benefits:**

- ✅ Edit files in your local IDE/editor
- ✅ Changes are immediately reflected in the container
- ✅ Build artifacts and dependencies persist between container restarts
- ✅ Fast rebuild times due to Docker layer caching

## 🐛 Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check Docker Desktop is running
docker ps

# Rebuild the image
docker-compose build --no-cache contracts-dev
```

#### 2. Permission Issues (Linux/WSL)

```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod +x docker-entrypoint.sh
```

#### 3. Dependencies Not Installing

```bash
# Force reinstall Foundry dependencies
docker-compose exec contracts-dev bash
forge install --force
```

#### 4. Tests Failing

```bash
# Clean and rebuild
docker-compose exec contracts-dev forge clean
docker-compose exec contracts-dev forge build
docker-compose exec contracts-dev forge test
```

#### 5. WSL2 Issues (Windows)

Make sure WSL2 is properly configured:

```powershell
# In PowerShell as Administrator
wsl --set-default-version 2
wsl --update
```

### Reset Everything

If you encounter persistent issues:

```bash
# Stop all containers
docker-compose down

# Remove volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d contracts-dev
```

## 🚀 Performance Tips

### 1. Enable BuildKit (Faster Builds)

Add to your shell profile:

```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

### 2. Allocate More Resources

In Docker Desktop:

- **Memory:** 4GB or more
- **CPU:** 2+ cores
- **Disk:** Enable "Use Docker Compose V2"

### 3. WSL2 Integration (Windows)

- Enable WSL2 integration in Docker Desktop
- Store project files in WSL2 filesystem for better performance
- Use Windows Terminal with WSL2 for best experience

## 📝 Available Scripts

### Direct Commands (run inside container)

| Command                | Description                   |
| ---------------------- | ----------------------------- |
| `forge build`          | Compile smart contracts       |
| `forge test`           | Run all tests                 |
| `forge test -vvv`      | Run tests with verbose output |
| `npm run test:gas`     | Run tests with gas reporting  |
| `npm run coverage`     | Generate test coverage report |
| `npm run dev`          | Watch mode for tests          |
| `npm run deploy:local` | Deploy to local network       |
| `npm run setup:cards`  | Setup card configuration      |
| `forge clean`          | Clean build artifacts         |

### Docker npm Scripts (run from host)

| Command                          | Description                                |
| -------------------------------- | ------------------------------------------ |
| `npm run docker:start`           | Start development container                |
| `npm run docker:stop`            | Stop all containers                        |
| `npm run docker:shell`           | Open interactive shell in container        |
| `npm run docker:build`           | Build Docker image                         |
| `npm run docker:rebuild`         | Rebuild Docker image from scratch          |
| `npm run docker:test`            | Run tests in container                     |
| `npm run docker:test:verbose`    | Run tests with verbose output in container |
| `npm run docker:test:gas`        | Run tests with gas reporting in container  |
| `npm run docker:build:contracts` | Build contracts in container               |
| `npm run docker:clean`           | Clean build artifacts in container         |
| `npm run docker:coverage`        | Generate coverage report in container      |
| `npm run docker:dev`             | Start watch mode for tests in container    |
| `npm run docker:blockchain`      | Start local blockchain (Anvil)             |
| `npm run docker:deploy:local`    | Deploy to local blockchain in container    |
| `npm run docker:setup`           | Setup card configuration in container      |
| `npm run docker:logs`            | Show container logs                        |
| `npm run docker:status`          | Show container status                      |
| `npm run docker:reset`           | Reset everything (rebuild from scratch)    |

## 🔒 Security Notes

### Environment Variables

For production deployments, create a `.env` file (not committed to git):

```bash
# apps/contracts/.env
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=your_sepolia_rpc_url
MAINNET_RPC_URL=your_mainnet_rpc_url
VRF_COORDINATOR=0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
```

Load in container:

```bash
docker-compose exec contracts-dev bash
source .env
npm run deploy:sepolia
```

### Best Practices

1. **Never commit private keys**
2. **Use hardware wallets for mainnet**
3. **Test on testnets first**
4. **Use multisig for contract ownership**
5. **Verify contracts on Etherscan**

## 🎯 Next Steps

1. **Run the test suite:** `forge test`
2. **Read the main [README.md](./README.md)** for contract details
3. **Check [EMISSION_MECHANICS.md](./EMISSION_MECHANICS.md)** for game mechanics
4. **Deploy to testnet** when ready
5. **Set up CI/CD** with GitHub Actions

## 💡 Tips for Windows Developers

- **Use Windows Terminal** with WSL2 for the best experience
- **Install Docker Desktop** with WSL2 backend
- **Store projects in WSL2** filesystem (`/home/username/projects/`)
- **Use VS Code** with Remote-WSL extension
- **Consider using Git Bash** or PowerShell if not using WSL2

## 🤝 Contributing

1. Make changes to source files locally
2. Test inside the Docker container
3. Ensure all tests pass: `forge test`
4. Check gas usage: `npm run test:gas`
5. Submit PR with Docker verification

---

**🚀 Happy Coding! Your Windows development environment is now production-ready! 🎉**
