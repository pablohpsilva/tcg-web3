/**
 * Core blockchain network configuration
 */
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * Card rarity levels
 */
export enum CardRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  EPIC = "epic",
  LEGENDARY = "legendary",
  MYTHIC = "mythic",
}

/**
 * Card types/categories
 */
export enum CardType {
  CREATURE = "creature",
  SPELL = "spell",
  ARTIFACT = "artifact",
  ENCHANTMENT = "enchantment",
  LAND = "land",
  PLANESWALKER = "planeswalker",
}

/**
 * Base card interface representing a single card
 */
export interface Card {
  // Blockchain identifiers
  tokenId: string;
  contractAddress: string;
  chainId: number;

  // Card metadata
  name: string;
  description?: string;
  image: string;
  rarity: CardRarity;
  type: CardType;
  cost?: number;
  power?: number;
  toughness?: number;

  // Set information
  setId: string;
  setName: string;
  cardNumber?: string;

  // Color identity (for MTG-style games)
  colors?: string[];
  colorIdentity?: string[];

  // Game mechanics
  keywords?: string[];
  abilities?: string[];

  // Ownership
  owner: string;

  // Additional metadata (flexible for different card types)
  attributes?: Record<string, any>;

  // Timestamps
  mintedAt?: Date;
  lastTransferAt?: Date;
}

/**
 * Card collection interface
 */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  cards: string[]; // Array of card IDs (tokenId:contractAddress format)

  // Metadata that can be auto-generated
  metadata?: CollectionMetadata;

  // Creator information
  creator: string;
  createdAt: Date;
  updatedAt: Date;

  // Additional properties
  tags?: string[];
  isPublic?: boolean;
  owner?: string; // Added to match test expectations
}

/**
 * Auto-generated collection metadata
 */
export interface CollectionMetadata {
  totalCards: number;
  totalCost: number;
  averageCost: number;

  // Rarity distribution
  rarityDistribution: Record<CardRarity, number>;

  // Type distribution
  typeDistribution: Record<CardType, number>;

  // Color distribution (for MTG-style games)
  colorDistribution?: Record<string, number>;

  // Power level metrics
  powerLevel?: number;
  averagePower?: number;
  averageToughness?: number;

  // Set distribution
  setDistribution: Record<string, number>;

  // Custom metadata based on configuration
  customMetrics?: Record<string, any>;
}

/**
 * Wallet information
 */
export interface Wallet {
  address: string;
  chainId: number;
  provider?: any; // Web3 provider (ethers, web3, etc.)
}

/**
 * Generic filter interface
 */
export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

/**
 * Filter operators
 */
export enum FilterOperator {
  EQUALS = "eq",
  NOT_EQUALS = "ne",
  GREATER_THAN = "gt",
  GREATER_THAN_OR_EQUAL = "gte",
  LESS_THAN = "lt",
  LESS_THAN_OR_EQUAL = "lte",
  IN = "in",
  NOT_IN = "nin",
  CONTAINS = "contains",
  NOT_CONTAINS = "not_contains",
  STARTS_WITH = "starts_with",
  ENDS_WITH = "ends_with",
  REGEX = "regex",
}

/**
 * Logical operators for combining filters
 */
export enum LogicalOperator {
  AND = "and",
  OR = "or",
}

/**
 * Sorting configuration
 */
export interface SortConfig {
  field: string;
  direction: SortDirection;
}

/**
 * Sort directions
 */
export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Query result interface
 */
export interface QueryResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Real-time update types
 */
export enum UpdateType {
  CARD_MINTED = "card_minted",
  CARD_TRANSFERRED = "card_transferred",
  CARD_BURNED = "card_burned",
  CARD_METADATA_UPDATED = "card_metadata_updated",
  COLLECTION_UPDATED = "collection_updated",
  SET_CREATED = "set_created",
  SET_LOCKED = "set_locked",
}

/**
 * Real-time update event
 */
export interface UpdateEvent {
  type: UpdateType;
  data: any;
  timestamp: Date;
  blockNumber?: number;
  transactionHash?: string;
}

/**
 * API authentication configuration
 */
export interface AuthConfig {
  apiKey?: string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
}
