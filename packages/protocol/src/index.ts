// Export all types
export * from "./types/index.js";

// Export core API components
export * from "./api/unified-api.js";

// Export providers
export * from "./providers/web3-provider.js";

// Export filtering system
export * from "./filters/filter-engine.js";

// Export main SDK interface
export * from "./sdk/tcg-protocol.js";

// Export metadata components
export * from "./metadata/metadata-calculator.js";
export * from "./metadata/template-manager.js";

// Export collection management
export * from "./collections/collection-manager.js";

// Export real-time management
export * from "./realtime/realtime-manager.js";

// Main factory function for creating SDK instances
export { createTCGProtocol } from "./sdk/factory.js";

// Version
export const VERSION = "0.1.0";
