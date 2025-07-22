#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");
const https = require("https");

class MTGJSONDownloader {
  constructor() {
    this.baseUrl = "https://mtgjson.com/api/v5";
    this.allSetsUrl = `${this.baseUrl}/AllPrintings.json`;
    this.setListUrl = `${this.baseUrl}/SetList.json`;
    this.outputDir = "./downloaded-sets";
  }

  /**
   * Make HTTPS request and return parsed JSON
   */
  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      console.log(`Fetching: ${url}`);

      const request = https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`)
          );
          return;
        }

        let data = "";
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      });

      request.on("error", reject);
      request.setTimeout(60000, () => {
        request.destroy();
        reject(new Error("Request timeout"));
      });
    });
  }

  /**
   * Get list of all available sets
   */
  async getAllSets() {
    try {
      const response = await this.makeRequest(this.setListUrl);
      return response.data || [];
    } catch (error) {
      console.warn("Failed to fetch set list, will try alternative method");
      return null;
    }
  }

  /**
   * Find set by name (case-insensitive, partial match)
   */
  findSetByName(sets, searchName) {
    const normalizedSearch = searchName.toLowerCase().trim();

    // Try exact match first
    let found = sets.find((set) => set.name.toLowerCase() === normalizedSearch);

    // Try partial match
    if (!found) {
      found = sets.find(
        (set) =>
          set.name.toLowerCase().includes(normalizedSearch) ||
          normalizedSearch.includes(set.name.toLowerCase())
      );
    }

    // Try matching by set code
    if (!found) {
      found = sets.find((set) => set.code.toLowerCase() === normalizedSearch);
    }

    return found;
  }

  /**
   * Download individual set data
   */
  async downloadSetData(setCode) {
    const setUrl = `${this.baseUrl}/${setCode}.json`;
    try {
      return await this.makeRequest(setUrl);
    } catch (error) {
      throw new Error(`Failed to download set ${setCode}: ${error.message}`);
    }
  }

  /**
   * Search for similar set names
   */
  findSimilarSets(sets, searchName, limit = 5) {
    const normalizedSearch = searchName.toLowerCase().trim();

    return sets
      .filter((set) => {
        const name = set.name.toLowerCase();
        return (
          name.includes(normalizedSearch) ||
          normalizedSearch.includes(name) ||
          this.calculateSimilarity(name, normalizedSearch) > 0.5
        );
      })
      .slice(0, limit)
      .map((set) => ({
        name: set.name,
        code: set.code,
        releaseDate: set.releaseDate,
        type: set.type,
      }));
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create output directory: ${error.message}`);
    }
  }

  /**
   * Save set data to file
   */
  async saveSetData(setData, setCode, setName) {
    await this.ensureOutputDir();

    const sanitizedName = setName
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_");
    const filename = `${setCode}_${sanitizedName}.json`;
    const filepath = path.join(this.outputDir, filename);

    try {
      await fs.writeFile(filepath, JSON.stringify(setData, null, 2));
      console.log(`✅ Set data saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      throw new Error(`Failed to save file: ${error.message}`);
    }
  }

  /**
   * Display set information
   */
  displaySetInfo(setData) {
    const set = setData.data;
    console.log("\n📋 Set Information:");
    console.log(`Name: ${set.name}`);
    console.log(`Code: ${set.code}`);
    console.log(`Release Date: ${set.releaseDate}`);
    console.log(`Type: ${set.type}`);
    console.log(`Total Cards: ${set.totalSetSize}`);
    console.log(`Base Set Size: ${set.baseSetSize}`);
    console.log(`Cards in JSON: ${set.cards.length}`);
    console.log(`Tokens: ${set.tokens.length}`);

    if (set.block) {
      console.log(`Block: ${set.block}`);
    }

    // Display some example cards
    if (set.cards.length > 0) {
      console.log("\n🃏 Sample Cards:");
      set.cards.slice(0, 5).forEach((card, index) => {
        console.log(
          `${index + 1}. ${card.name} (${card.manaCost || "No cost"}) - ${
            card.type
          }`
        );
      });

      if (set.cards.length > 5) {
        console.log(`... and ${set.cards.length - 5} more cards`);
      }
    }
  }

  /**
   * Main download function
   */
  async downloadSet(setName) {
    try {
      console.log(`🔍 Searching for set: "${setName}"`);

      // Get all available sets
      const sets = await this.getAllSets();
      if (!sets) {
        throw new Error("Could not retrieve set list from MTGJSON");
      }

      console.log(`📚 Found ${sets.length} available sets`);

      // Find the requested set
      const foundSet = this.findSetByName(sets, setName);

      if (!foundSet) {
        console.log(`❌ Set "${setName}" not found.`);

        // Show similar sets
        const similar = this.findSimilarSets(sets, setName);
        if (similar.length > 0) {
          console.log("\n🔍 Did you mean one of these?");
          similar.forEach((set, index) => {
            console.log(
              `${index + 1}. ${set.name} (${set.code}) - ${set.releaseDate}`
            );
          });
        }
        return false;
      }

      console.log(`✅ Found set: ${foundSet.name} (${foundSet.code})`);

      // Download set data
      console.log(`📥 Downloading set data...`);
      const setData = await this.downloadSetData(foundSet.code);

      // Display information
      this.displaySetInfo(setData);

      // Save to file
      const savedPath = await this.saveSetData(
        setData,
        foundSet.code,
        foundSet.name
      );

      console.log(`\n🎉 Successfully downloaded "${foundSet.name}"!`);
      console.log(`📁 File saved to: ${savedPath}`);

      return true;
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return false;
    }
  }

  /**
   * List all available sets
   */
  async listAllSets() {
    try {
      console.log("📚 Fetching all available sets...");
      const sets = await this.getAllSets();

      if (!sets) {
        throw new Error("Could not retrieve set list");
      }

      console.log(`\n📋 Available Sets (${sets.length} total):\n`);

      // Group by type
      const groupedSets = sets.reduce((acc, set) => {
        const type = set.type || "Unknown";
        if (!acc[type]) acc[type] = [];
        acc[type].push(set);
        return acc;
      }, {});

      // Display grouped sets
      Object.keys(groupedSets)
        .sort()
        .forEach((type) => {
          console.log(`\n🏷️  ${type}:`);
          groupedSets[type]
            .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
            .forEach((set) => {
              console.log(`  • ${set.name} (${set.code}) - ${set.releaseDate}`);
            });
        });
    } catch (error) {
      console.error(`❌ Error listing sets: ${error.message}`);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const downloader = new MTGJSONDownloader();

  if (args.length === 0) {
    console.log(`
🎴 MTGJSON Set Downloader

Usage:
  node mtgjson-downloader.js <set-name>     Download a specific set
  node mtgjson-downloader.js --list         List all available sets
  node mtgjson-downloader.js --help         Show this help

Examples:
  node mtgjson-downloader.js "Limited Edition Alpha"
  node mtgjson-downloader.js "LEA"
  node mtgjson-downloader.js "Innistrad"
  node mtgjson-downloader.js --list

The script will:
1. Search for the set by name (case-insensitive)
2. Download all cards and metadata from MTGJSON
3. Save the complete data as a JSON file
4. Display set information and sample cards
        `);
    process.exit(0);
  }

  if (args[0] === "--help" || args[0] === "-h") {
    console.log(`
🎴 MTGJSON Set Downloader Help

This script downloads Magic: The Gathering set data from MTGJSON.com

Commands:
  <set-name>    Download a specific set by name or code
  --list        Show all available sets grouped by type
  --help        Show this help message

Set Name Examples:
  • "Limited Edition Alpha" or "LEA"
  • "Innistrad" or "ISD"  
  • "Modern Horizons" or "MH1"
  • "Throne of Eldraine" or "ELD"

Features:
  ✅ Fuzzy name matching
  ✅ Set code search
  ✅ Complete card data with metadata
  ✅ Organized JSON output
  ✅ Error handling and suggestions

Output:
  Files are saved to ./downloaded-sets/ directory
  Format: {SET_CODE}_{SET_NAME}.json
        `);
    process.exit(0);
  }

  if (args[0] === "--list") {
    await downloader.listAllSets();
    process.exit(0);
  }

  const setName = args.join(" ");
  const success = await downloader.downloadSet(setName);
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
}

module.exports = MTGJSONDownloader;
