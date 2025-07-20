# TCG Magic - Turborepo Monorepo

A modern monorepo for trading card game smart contracts and applications, built with [Turborepo](https://turbo.build/) and [Foundry](https://getfoundry.sh/).

## 🏗️ What's Inside?

This Turborepo includes the following packages/apps:

### Apps

- `apps/contracts`: Smart contracts built with Foundry

### Packages

- `packages/*`: Shared packages (coming soon)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Foundry](https://getfoundry.sh/) for smart contract development

### Installation

```bash
npm install
```

### Development Commands

#### Build

Build all apps and packages:

```bash
npm run build
```

#### Test

Run tests across all packages:

```bash
npm run test
```

#### Development

Start development mode:

```bash
npm run dev
```

#### Linting

Run linting across all packages:

```bash
npm run lint
```

### Smart Contract Development

The smart contracts are located in `apps/contracts/`. You can work with them using these commands:

```bash
# Navigate to contracts
cd apps/contracts

# Build contracts
npm run build
# or: forge build

# Run tests
npm run test
# or: forge test

# Run tests with verbose output
npm run test:verbose
# or: forge test -vvv

# Deploy contracts (example)
npm run deploy
# or: forge script script/Counter.s.sol
```

## 📁 Project Structure

```
tcg-magic/
├── apps/
│   └── contracts/          # Foundry smart contracts
│       ├── src/           # Contract source files
│       ├── test/          # Contract tests
│       ├── script/        # Deployment scripts
│       ├── lib/           # Dependencies
│       └── foundry.toml   # Foundry configuration
├── packages/              # Shared packages (future)
├── package.json          # Root package.json with workspaces
├── turbo.json           # Turborepo configuration
└── README.md            # This file
```

## 🛠️ Adding New Apps

To add a new app to the monorepo:

1. Create a new directory in `apps/`
2. Add a `package.json` with appropriate scripts
3. Update the root workspace configuration if needed
4. The Turborepo will automatically detect and include it

## 📚 Learn More

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Foundry Documentation](https://book.getfoundry.sh/)
- [Solidity Documentation](https://docs.soliditylang.org/)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.
