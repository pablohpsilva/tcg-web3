import { ethers, Contract, Provider } from "ethers";
import {
  BaseProvider,
  ProviderType,
  Web3ProviderConfig,
} from "../types/providers.js";
import {
  Card,
  QueryResult,
  Filter,
  SortConfig,
  PaginationConfig,
  CardRarity,
  CardType,
  NetworkConfig,
} from "../types/core.js";

/**
 * Supported networks configuration
 */
export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  // Polygon Mainnet
  137: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    blockExplorer: "https://polygonscan.com",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
  },
  // Polygon Mumbai Testnet
  80001: {
    chainId: 80001,
    name: "Polygon Mumbai",
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    blockExplorer: "https://mumbai.polygonscan.com",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
  },
  // Ethereum Mainnet (for future expansion)
  1: {
    chainId: 1,
    name: "Ethereum",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
    blockExplorer: "https://etherscan.io",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

/**
 * Contract ABI for ERC-721 tokens (TCG cards)
 */
const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

/**
 * Contract ABI for TCG-specific functions (if available)
 */
const TCG_CARD_ABI = [
  ...ERC721_ABI,
  "function getCardMetadata(uint256 tokenId) view returns (tuple(string name, string description, uint8 rarity, uint8 cardType, uint256 cost, uint256 power, uint256 toughness, string setId))",
  "function getCardSet(uint256 tokenId) view returns (string)",
  "function isCardInSet(uint256 tokenId, string setId) view returns (bool)",
];

/**
 * Web3 provider for direct blockchain interaction
 */
export class Web3Provider implements BaseProvider {
  readonly type = ProviderType.WEB3_DIRECT;

  private config: Web3ProviderConfig;
  private provider: Provider;
  private contracts: Map<string, Contract> = new Map();
  private _isConnected = false;

  constructor(config: Web3ProviderConfig) {
    this.config = config;

    // Initialize provider
    if (config.provider) {
      this.provider = config.provider;
    } else if (config.rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    } else {
      const networkConfig = SUPPORTED_NETWORKS[config.networkConfig.chainId];
      if (!networkConfig) {
        throw new Error(`Unsupported network: ${config.networkConfig.chainId}`);
      }
      this.provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    }
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.provider.getNetwork();

      // Initialize contracts
      for (const contractAddress of this.config.contractAddresses) {
        const contract = new Contract(
          contractAddress,
          TCG_CARD_ABI,
          this.provider
        );
        this.contracts.set(contractAddress.toLowerCase(), contract);
      }

      this._isConnected = true;
    } catch (error) {
      throw new Error(`Failed to initialize Web3 provider: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.contracts.clear();
    this._isConnected = false;
  }

  async getCardsByWallet(
    wallet: string,
    filters?: Filter[],
    sort?: SortConfig[],
    pagination?: PaginationConfig
  ): Promise<QueryResult<Card>> {
    const allCards: Card[] = [];

    // Get cards from all configured contracts
    for (const [contractAddress, contract] of this.contracts) {
      try {
        const balance = await contract.balanceOf(wallet);
        const balanceNumber = Number(balance);

        for (let i = 0; i < balanceNumber; i++) {
          try {
            const tokenId = await contract.tokenOfOwnerByIndex(wallet, i);
            const card = await this.getCardFromContract(
              contractAddress,
              tokenId.toString()
            );
            if (card) {
              allCards.push(card);
            }
          } catch (error) {
            console.warn(
              `Failed to get token ${i} for wallet ${wallet}:`,
              error
            );
          }
        }
      } catch (error) {
        console.warn(
          `Failed to get cards from contract ${contractAddress}:`,
          error
        );
      }
    }

    return this.processQueryResult(allCards, filters, sort, pagination);
  }

  async getCard(
    contractAddress: string,
    tokenId: string
  ): Promise<Card | null> {
    return this.getCardFromContract(contractAddress, tokenId);
  }

  async getCardsByContract(
    contractAddress: string,
    filters?: Filter[],
    sort?: SortConfig[],
    pagination?: PaginationConfig
  ): Promise<QueryResult<Card>> {
    const contract = this.contracts.get(contractAddress.toLowerCase());
    if (!contract) {
      throw new Error(`Contract ${contractAddress} not configured`);
    }

    const cards: Card[] = [];

    try {
      const totalSupply = await contract.totalSupply();
      const totalSupplyNumber = Number(totalSupply);

      for (let i = 0; i < totalSupplyNumber; i++) {
        try {
          const tokenId = await contract.tokenByIndex(i);
          const card = await this.getCardFromContract(
            contractAddress,
            tokenId.toString()
          );
          if (card) {
            cards.push(card);
          }
        } catch (error) {
          console.warn(
            `Failed to get token ${i} from contract ${contractAddress}:`,
            error
          );
        }
      }
    } catch (error) {
      console.warn(
        `Failed to get total supply from contract ${contractAddress}:`,
        error
      );
    }

    return this.processQueryResult(cards, filters, sort, pagination);
  }

  async getCardsBySet(
    setId: string,
    filters?: Filter[],
    sort?: SortConfig[],
    pagination?: PaginationConfig
  ): Promise<QueryResult<Card>> {
    const allCards: Card[] = [];

    // Search through all contracts for cards in the specified set
    for (const [contractAddress, contract] of this.contracts) {
      try {
        const totalSupply = await contract.totalSupply();
        const totalSupplyNumber = Number(totalSupply);

        for (let i = 0; i < totalSupplyNumber; i++) {
          try {
            const tokenId = await contract.tokenByIndex(i);

            // Check if card is in the specified set
            try {
              const isInSet = await contract.isCardInSet(tokenId, setId);
              if (isInSet) {
                const card = await this.getCardFromContract(
                  contractAddress,
                  tokenId.toString()
                );
                if (card) {
                  allCards.push(card);
                }
              }
            } catch {
              // If isCardInSet is not available, get card and check setId
              const card = await this.getCardFromContract(
                contractAddress,
                tokenId.toString()
              );
              if (card && card.setId === setId) {
                allCards.push(card);
              }
            }
          } catch (error) {
            console.warn(`Failed to check token ${i} for set ${setId}:`, error);
          }
        }
      } catch (error) {
        console.warn(
          `Failed to search set ${setId} in contract ${contractAddress}:`,
          error
        );
      }
    }

    return this.processQueryResult(allCards, filters, sort, pagination);
  }

  async searchCards(
    filters: Filter[],
    sort?: SortConfig[],
    pagination?: PaginationConfig
  ): Promise<QueryResult<Card>> {
    // For Web3 provider, we need to get all cards first then filter
    // This is not efficient for large datasets, consider using indexing services
    const allCards: Card[] = [];

    for (const [contractAddress] of this.contracts) {
      const contractCards = await this.getCardsByContract(contractAddress);
      allCards.push(...contractCards.data);
    }

    return this.processQueryResult(allCards, filters, sort, pagination);
  }

  private async getCardFromContract(
    contractAddress: string,
    tokenId: string
  ): Promise<Card | null> {
    const contract = this.contracts.get(contractAddress.toLowerCase());
    if (!contract) {
      return null;
    }

    try {
      const [owner, tokenURI] = await Promise.all([
        contract.ownerOf(tokenId),
        contract.tokenURI(tokenId),
      ]);

      // Try to get metadata from contract if available
      let metadata: any = {};
      try {
        metadata = await contract.getCardMetadata(tokenId);
      } catch {
        // If getCardMetadata is not available, we'll parse from tokenURI
      }

      // Fetch metadata from tokenURI
      let metadataFromURI: any = {};
      if (tokenURI) {
        try {
          const response = await fetch(tokenURI);
          metadataFromURI = await response.json();
        } catch (error) {
          console.warn(`Failed to fetch metadata from URI ${tokenURI}:`, error);
        }
      }

      // Combine metadata sources
      const combinedMetadata = { ...metadataFromURI, ...metadata };

      return {
        tokenId,
        contractAddress,
        chainId: this.config.networkConfig.chainId,
        name: combinedMetadata.name || `Card #${tokenId}`,
        description: combinedMetadata.description,
        image: combinedMetadata.image || "",
        rarity: this.parseRarity(combinedMetadata.rarity),
        type: this.parseCardType(
          combinedMetadata.cardType || combinedMetadata.type
        ),
        cost: Number(combinedMetadata.cost) || undefined,
        power: Number(combinedMetadata.power) || undefined,
        toughness: Number(combinedMetadata.toughness) || undefined,
        setId: combinedMetadata.setId || combinedMetadata.set || "unknown",
        setName:
          combinedMetadata.setName || combinedMetadata.setId || "Unknown Set",
        cardNumber: combinedMetadata.cardNumber,
        colors: combinedMetadata.colors,
        colorIdentity: combinedMetadata.colorIdentity,
        keywords: combinedMetadata.keywords,
        abilities: combinedMetadata.abilities,
        owner,
        attributes: combinedMetadata.attributes,
        mintedAt: combinedMetadata.mintedAt
          ? new Date(combinedMetadata.mintedAt)
          : undefined,
        lastTransferAt: new Date(), // We'd need to track this from events
      };
    } catch (error) {
      console.warn(
        `Failed to get card ${tokenId} from contract ${contractAddress}:`,
        error
      );
      return null;
    }
  }

  private parseRarity(rarity: any): CardRarity {
    if (typeof rarity === "number") {
      const rarityMap = [
        CardRarity.COMMON,
        CardRarity.UNCOMMON,
        CardRarity.RARE,
        CardRarity.EPIC,
        CardRarity.LEGENDARY,
        CardRarity.MYTHIC,
      ];
      return rarityMap[rarity] || CardRarity.COMMON;
    }

    if (typeof rarity === "string") {
      return (rarity.toLowerCase() as CardRarity) || CardRarity.COMMON;
    }

    return CardRarity.COMMON;
  }

  private parseCardType(type: any): CardType {
    if (typeof type === "number") {
      const typeMap = [
        CardType.CREATURE,
        CardType.SPELL,
        CardType.ARTIFACT,
        CardType.ENCHANTMENT,
        CardType.LAND,
        CardType.PLANESWALKER,
      ];
      return typeMap[type] || CardType.CREATURE;
    }

    if (typeof type === "string") {
      return (type.toLowerCase() as CardType) || CardType.CREATURE;
    }

    return CardType.CREATURE;
  }

  private processQueryResult(
    cards: Card[],
    filters?: Filter[],
    sort?: SortConfig[],
    pagination?: PaginationConfig
  ): QueryResult<Card> {
    let filteredCards = [...cards];

    // Apply filters
    if (filters && filters.length > 0) {
      filteredCards = this.applyFilters(filteredCards, filters);
    }

    // Apply sorting
    if (sort && sort.length > 0) {
      filteredCards = this.applySorting(filteredCards, sort);
    }

    const total = filteredCards.length;

    // Apply pagination
    if (pagination) {
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      filteredCards = filteredCards.slice(startIndex, endIndex);
    }

    return {
      data: filteredCards,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || total,
        total,
        totalPages: pagination ? Math.ceil(total / pagination.limit) : 1,
        hasNext: pagination
          ? pagination.page * pagination.limit < total
          : false,
        hasPrev: pagination ? pagination.page > 1 : false,
      },
    };
  }

  private applyFilters(cards: Card[], filters: Filter[]): Card[] {
    return cards.filter((card) => {
      return filters.every((filter) => this.evaluateFilter(card, filter));
    });
  }

  private evaluateFilter(card: Card, filter: Filter): boolean {
    const value = this.getNestedValue(card, filter.field);

    switch (filter.operator) {
      case "eq":
        return value === filter.value;
      case "neq":
        return value !== filter.value;
      case "gt":
        return Number(value) > Number(filter.value);
      case "gte":
        return Number(value) >= Number(filter.value);
      case "lt":
        return Number(value) < Number(filter.value);
      case "lte":
        return Number(value) <= Number(filter.value);
      case "in":
        return Array.isArray(filter.value) && filter.value.includes(value);
      case "nin":
        return Array.isArray(filter.value) && !filter.value.includes(value);
      case "contains":
        return String(value)
          .toLowerCase()
          .includes(String(filter.value).toLowerCase());
      case "not_contains":
        return !String(value)
          .toLowerCase()
          .includes(String(filter.value).toLowerCase());
      case "starts_with":
        return String(value)
          .toLowerCase()
          .startsWith(String(filter.value).toLowerCase());
      case "ends_with":
        return String(value)
          .toLowerCase()
          .endsWith(String(filter.value).toLowerCase());
      case "regex":
        return new RegExp(filter.value).test(String(value));
      default:
        return true;
    }
  }

  private applySorting(cards: Card[], sort: SortConfig[]): Card[] {
    return cards.sort((a, b) => {
      for (const sortConfig of sort) {
        const valueA = this.getNestedValue(a, sortConfig.field);
        const valueB = this.getNestedValue(b, sortConfig.field);

        let comparison = 0;
        if (valueA < valueB) comparison = -1;
        if (valueA > valueB) comparison = 1;

        if (comparison !== 0) {
          return sortConfig.direction === "desc" ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Factory for creating Web3 providers for different networks
 */
export class Web3ProviderFactory {
  static createPolygonProvider(
    contractAddresses: string[],
    rpcUrl?: string,
    isTestnet = false
  ): Web3Provider {
    const chainId = isTestnet ? 80001 : 137;
    const networkConfig = SUPPORTED_NETWORKS[chainId];

    return new Web3Provider({
      type: ProviderType.WEB3_DIRECT,
      networkConfig,
      contractAddresses,
      rpcUrl: rpcUrl || networkConfig.rpcUrl,
    });
  }

  static createEthereumProvider(
    contractAddresses: string[],
    rpcUrl?: string
  ): Web3Provider {
    const networkConfig = SUPPORTED_NETWORKS[1];

    return new Web3Provider({
      type: ProviderType.WEB3_DIRECT,
      networkConfig,
      contractAddresses,
      rpcUrl: rpcUrl || networkConfig.rpcUrl,
    });
  }

  static createCustomProvider(
    networkConfig: NetworkConfig,
    contractAddresses: string[],
    rpcUrl?: string,
    provider?: any
  ): Web3Provider {
    return new Web3Provider({
      type: ProviderType.WEB3_DIRECT,
      networkConfig,
      contractAddresses,
      rpcUrl,
      provider,
    });
  }

  static getSupportedNetworks(): Record<number, NetworkConfig> {
    return { ...SUPPORTED_NETWORKS };
  }

  static addNetwork(chainId: number, config: NetworkConfig): void {
    SUPPORTED_NETWORKS[chainId] = config;
  }
}
