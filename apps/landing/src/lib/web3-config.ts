import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon, polygonMumbai } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "TCG Magic",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [polygon, polygonMumbai],
  ssr: true,
});

// Smart contract addresses (will be updated with deployed contracts)
export const CONTRACTS = {
  // Example CardSet contract address - update this with your deployed contract
  CARD_SET: "0x..." as const,
} as const;

// ABI definitions for the contracts
export const CARD_SET_ABI = [
  // Core view functions
  "function getSetInfo() external view returns (tuple(string name, uint256 emissionCap, uint256 totalEmission, uint256 packPrice, address[] cardContracts, bool isLocked))",
  "function getDeckTypeNames() external view returns (string[] memory)",
  "function getDeckPrice(string calldata deckType) external view returns (uint256)",
  "function packPrice() external view returns (uint256)",
  "function totalEmission() external view returns (uint256)",
  "function emissionCap() external view returns (uint256)",
  "function getUserStats(address user) external view returns (uint256 packsOpened, uint256 decksOpened)",

  // Pack and deck opening functions
  "function openPack() external payable",
  "function openDeck(string calldata deckType) external payable returns (uint256[] memory)",

  // Events
  "event PackOpened(address indexed user, address[] cardContracts, uint256[] tokenIds)",
  "event DeckOpened(address indexed user, string deckType, address[] cardContracts, uint256[] tokenIds)",
] as const;

export const CARD_ABI = [
  // ERC1155 standard
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory)",

  // Card specific functions
  "function cardInfo() external view returns (tuple(uint256 cardId, string name, uint8 rarity, uint256 maxSupply, uint256 currentSupply, string metadataURI, bool active))",
  "function name() external view returns (string memory)",
  "function rarity() external view returns (uint8)",
] as const;
