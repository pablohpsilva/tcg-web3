import { describe, it, expect } from "vitest";
import {
  CardRarity,
  CardType,
  FilterOperator,
  LogicalOperator,
  SortDirection,
  UpdateType,
  type Card,
  type Collection,
  type Filter,
  type SortConfig,
  type QueryResult,
  type UpdateEvent,
} from "../core.js";

describe("Core Types", () => {
  describe("Enums", () => {
    it("should define CardRarity enum correctly", () => {
      expect(CardRarity.COMMON).toBe("common");
      expect(CardRarity.UNCOMMON).toBe("uncommon");
      expect(CardRarity.RARE).toBe("rare");
      expect(CardRarity.EPIC).toBe("epic");
      expect(CardRarity.LEGENDARY).toBe("legendary");
      expect(CardRarity.MYTHIC).toBe("mythic");
    });

    it("should define CardType enum correctly", () => {
      expect(CardType.CREATURE).toBe("creature");
      expect(CardType.SPELL).toBe("spell");
      expect(CardType.ARTIFACT).toBe("artifact");
      expect(CardType.ENCHANTMENT).toBe("enchantment");
      expect(CardType.PLANESWALKER).toBe("planeswalker");
      expect(CardType.LAND).toBe("land");
    });

    it("should define FilterOperator enum correctly", () => {
      expect(FilterOperator.EQUALS).toBe("eq");
      expect(FilterOperator.NOT_EQUALS).toBe("ne");
      expect(FilterOperator.GREATER_THAN).toBe("gt");
      expect(FilterOperator.LESS_THAN).toBe("lt");
      expect(FilterOperator.CONTAINS).toBe("contains");
      expect(FilterOperator.IN).toBe("in");
    });

    it("should define LogicalOperator enum correctly", () => {
      expect(LogicalOperator.AND).toBe("and");
      expect(LogicalOperator.OR).toBe("or");
    });

    it("should define SortDirection enum correctly", () => {
      expect(SortDirection.ASC).toBe("asc");
      expect(SortDirection.DESC).toBe("desc");
    });

    it("should define UpdateType enum correctly", () => {
      expect(UpdateType.CARD_TRANSFERRED).toBe("card_transferred");
      expect(UpdateType.CARD_MINTED).toBe("card_minted");
      expect(UpdateType.COLLECTION_UPDATED).toBe("collection_updated");
    });
  });

  describe("Card Interface", () => {
    it("should create a valid Card object", () => {
      const card: Card = {
        tokenId: "123",
        contractAddress: "0x123...",
        chainId: 137,
        name: "Test Card",
        image: "https://example.com/card.png",
        rarity: CardRarity.RARE,
        type: CardType.CREATURE,
        setId: "set1",
        setName: "Test Set",
        owner: "0xowner...",
      };

      expect(card.tokenId).toBe("123");
      expect(card.name).toBe("Test Card");
      expect(card.rarity).toBe(CardRarity.RARE);
      expect(card.type).toBe(CardType.CREATURE);
    });

    it("should support optional Card properties", () => {
      const card: Card = {
        tokenId: "123",
        contractAddress: "0x123...",
        chainId: 137,
        name: "Test Card",
        image: "https://example.com/card.png",
        rarity: CardRarity.RARE,
        type: CardType.CREATURE,
        setId: "set1",
        setName: "Test Set",
        owner: "0xowner...",
        description: "A test card",
        cost: 3,
        power: 2,
        toughness: 2,
        cardNumber: "001",
        colors: ["red", "blue"],
        colorIdentity: ["R", "U"],
        keywords: ["flying", "haste"],
        abilities: ["Deal 2 damage"],
        attributes: { custom: "value" },
        mintedAt: new Date(),
        lastTransferAt: new Date(),
      };

      expect(card.description).toBe("A test card");
      expect(card.cost).toBe(3);
      expect(card.power).toBe(2);
      expect(card.colors).toEqual(["red", "blue"]);
    });
  });

  describe("Collection Interface", () => {
    it("should create a valid Collection object", () => {
      const collection: Collection = {
        id: "collection1",
        name: "My Deck",
        cards: ["1", "2", "3"],
        owner: "0xowner...",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(collection.id).toBe("collection1");
      expect(collection.name).toBe("My Deck");
      expect(collection.cards).toEqual(["1", "2", "3"]);
    });
  });

  describe("Filter Interface", () => {
    it("should create a valid Filter object", () => {
      const filter: Filter = {
        field: "rarity",
        operator: FilterOperator.EQUALS,
        value: CardRarity.RARE,
      };

      expect(filter.field).toBe("rarity");
      expect(filter.operator).toBe(FilterOperator.EQUALS);
      expect(filter.value).toBe(CardRarity.RARE);
    });

    it("should support nested filters with logical operators", () => {
      const filter: Filter = {
        field: "rarity",
        operator: FilterOperator.EQUALS,
        value: CardRarity.RARE,
        logicalOperator: LogicalOperator.AND,
        nestedFilters: [
          {
            field: "type",
            operator: FilterOperator.EQUALS,
            value: CardType.CREATURE,
          },
        ],
      };

      expect(filter.logicalOperator).toBe(LogicalOperator.AND);
      expect(filter.nestedFilters).toHaveLength(1);
      expect(filter.nestedFilters![0].field).toBe("type");
    });
  });

  describe("SortConfig Interface", () => {
    it("should create a valid SortConfig object", () => {
      const sortConfig: SortConfig = {
        field: "name",
        direction: SortDirection.ASC,
      };

      expect(sortConfig.field).toBe("name");
      expect(sortConfig.direction).toBe(SortDirection.ASC);
    });
  });

  describe("QueryResult Interface", () => {
    it("should create a valid QueryResult object", () => {
      const queryResult: QueryResult<Card> = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        hasMore: false,
      };

      expect(queryResult.data).toEqual([]);
      expect(queryResult.total).toBe(0);
      expect(queryResult.hasMore).toBe(false);
    });
  });

  describe("UpdateEvent Interface", () => {
    it("should create a valid UpdateEvent object", () => {
      const updateEvent: UpdateEvent = {
        type: UpdateType.CARD_TRANSFERRED,
        data: {
          tokenId: "123",
          from: "0xfrom...",
          to: "0xto...",
        },
        timestamp: new Date(),
      };

      expect(updateEvent.type).toBe(UpdateType.CARD_TRANSFERRED);
      expect(updateEvent.data.tokenId).toBe("123");
      expect(updateEvent.timestamp).toBeInstanceOf(Date);
    });
  });
});
