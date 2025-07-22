# TCG Magic Landing Page

A modern, responsive landing page for the TCG Magic blockchain trading card game. Built with Next.js, TypeScript, Tailwind CSS, and integrated with Web3 functionality using wagmi, viem, and RainbowKit.

## 🚀 Features

### 🎮 Game Overview

- **Exciting hero section** with gradient backgrounds and card previews
- **TBD banner placeholder** for upcoming game cards and sets
- **Feature highlights** showcasing provably fair gameplay, true ownership, and low gas fees

### 💰 Pricing & Purchasing

- **Pack vs Deck comparison** with detailed explanations
- **Live pricing** pulled directly from smart contracts on Polygon
- **Interactive purchase buttons** with full Web3 transaction handling
- **Transaction status tracking** with Polygonscan links

### 📊 Live Statistics

- **Real-time stats** showing cards minted, packs remaining, and set completion
- **Emission progress visualization** with animated progress bars
- **User-specific stats** when wallet is connected
- **Dynamic data** pulled directly from blockchain

### 🔗 Web3 Integration

- **RainbowKit wallet connection** supporting all major wallets
- **Polygon network focus** with Mumbai testnet support
- **Smart contract interaction** for pack/deck purchases
- **Real-time transaction monitoring** with success/error handling

## 🛠️ Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **wagmi** for Ethereum interactions
- **viem** for low-level blockchain operations
- **RainbowKit** for wallet connection UI
- **@tanstack/react-query** for data fetching

## 📋 Prerequisites

- Node.js 18+ and npm
- A WalletConnect Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/)
- Deployed CardSet smart contract on Polygon/Mumbai

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd apps/landing
npm install
```

### 2. Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required: Get from https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Required: Your deployed CardSet contract address
NEXT_PUBLIC_CARDSET_CONTRACT_ADDRESS=0x...

# Optional: Custom RPC URLs
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
```

### 3. Update Contract Configuration

Edit `src/lib/web3-config.ts` and update the `CONTRACTS` object with your deployed contract addresses:

```typescript
export const CONTRACTS = {
  CARD_SET: "0x..." as const, // Your CardSet contract address
} as const;
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

## 🏗️ Project Structure

```
apps/landing/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout with Web3Provider
│   │   └── page.tsx            # Main landing page
│   ├── components/             # React components
│   │   ├── providers/
│   │   │   └── Web3Provider.tsx # Web3 context provider
│   │   ├── ui/
│   │   │   └── Button.tsx      # Reusable button component
│   │   ├── HeroSection.tsx     # Hero section with banner
│   │   ├── PricingSection.tsx  # Pack vs deck pricing
│   │   ├── StatsSection.tsx    # Live game statistics
│   │   └── PurchaseSection.tsx # Purchase functionality
│   └── lib/
│       ├── web3-config.ts      # Web3 configuration and ABIs
│       └── utils.ts            # Utility functions
├── .env.example                # Environment variables template
├── package.json
└── README.md
```

## 🎨 Key Components

### HeroSection

- Gradient hero with TCG Magic branding
- TBD placeholder for game banners
- Feature highlights with icons
- Connect wallet integration

### PricingSection

- Side-by-side pack vs deck comparison
- Live pricing from smart contracts
- Detailed feature explanations
- Comparison table

### StatsSection

- Global game statistics (cards minted, remaining packs, etc.)
- User-specific stats when connected
- Emission progress visualization
- Real-time blockchain data

### PurchaseSection

- Functional buy buttons for packs and decks
- Transaction status monitoring
- Error handling and success states
- Polygonscan transaction links

## 🔧 Smart Contract Integration

The app integrates with the following smart contract functions:

### Read Functions

- `getSetInfo()` - Set metadata and stats
- `packPrice()` - Current pack price
- `getDeckTypeNames()` - Available deck types
- `getDeckPrice(string)` - Price for specific deck
- `getUserStats(address)` - User-specific statistics

### Write Functions

- `openPack()` - Purchase and open a booster pack
- `openDeck(string)` - Purchase and open a preconstructed deck

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Manual Deployment

```bash
npm run build
npm start
```

## 🎯 Customization

### Adding New Card Sets

Update `CONTRACTS` in `web3-config.ts` with new contract addresses.

### Styling Changes

All styles use Tailwind CSS. Key design tokens:

- Purple (`purple-600`) for packs
- Blue (`blue-600`) for decks
- Gray (`gray-900`) for backgrounds
- Gradient overlays for visual appeal

### New Features

The modular component structure makes it easy to add:

- Collection viewer
- Deck builder interface
- Trading marketplace
- Battle system UI

## 🐛 Troubleshooting

### Common Issues

**"Contract not found" errors:**

- Verify contract address in `.env.local`
- Ensure you're on the correct network (Polygon/Mumbai)

**Wallet connection issues:**

- Check WalletConnect Project ID
- Clear browser cache and try again

**Transaction failures:**

- Ensure sufficient MATIC for gas fees
- Check if contract is paused or has restrictions

**Data not loading:**

- Verify RPC endpoints are working
- Check browser console for errors

## 📄 License

MIT License - see the main project license for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🔗 Related

- [Smart Contracts](../contracts/) - The backend smart contracts
- [TCG Magic Documentation](../../README.md) - Main project documentation
