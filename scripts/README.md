# MTGJSON Set Downloader

A comprehensive Node.js script to download Magic: The Gathering set data from [MTGJSON.com](https://mtgjson.com/) by set name.

## Features

✅ **Smart Set Search**: Find sets by full name, partial name, or set code  
✅ **Fuzzy Matching**: Handles typos and partial matches with suggestions  
✅ **Complete Data**: Downloads all cards, metadata, tokens, and set information  
✅ **Organized Output**: Clean JSON files with readable naming  
✅ **Error Handling**: Robust error handling with helpful messages  
✅ **Set Discovery**: List all available sets grouped by type

## Quick Start

### Prerequisites

- Node.js (v12 or higher)
- Internet connection

### Installation

1. Save the script as `mtgjson-downloader.js`
2. Make it executable (optional):
   ```bash
   chmod +x mtgjson-downloader.js
   ```

### Basic Usage

```bash
# Download by set name
node mtgjson-downloader.js "Limited Edition Alpha"

# Download by set code
node mtgjson-downloader.js "LEA"

# List all available sets
node mtgjson-downloader.js --list

# Show help
node mtgjson-downloader.js --help
```

## Examples

### Download Specific Sets

```bash
# Classic sets
node mtgjson-downloader.js "Limited Edition Alpha"
node mtgjson-downloader.js "Innistrad"
node mtgjson-downloader.js "Modern Horizons"

# Using set codes
node mtgjson-downloader.js "LEA"
node mtgjson-downloader.js "ISD"
node mtgjson-downloader.js "MH1"

# Partial name matching
node mtgjson-downloader.js "Alpha"        # Finds "Limited Edition Alpha"
node mtgjson-downloader.js "Throne"       # Finds "Throne of Eldraine"
node mtgjson-downloader.js "Modern"       # Finds multiple Modern sets
```

### Browse Available Sets

```bash
# List all sets grouped by type
node mtgjson-downloader.js --list

# This will show sets organized like:
# 🏷️ Core
#   • Magic 2015 Core Set (M15) - 2014-07-18
#   • Magic 2014 Core Set (M14) - 2013-07-19
#
# 🏷️ Expansion
#   • March of the Machine (MOM) - 2023-04-21
#   • Phyrexia: All Will Be One (ONE) - 2023-02-10
```

## Output

### File Structure

Downloaded files are saved to the `./downloaded-sets/` directory with the naming pattern:

```
{SET_CODE}_{SET_NAME}.json
```

Examples:

- `LEA_Limited_Edition_Alpha.json`
- `ISD_Innistrad.json`
- `MH1_Modern_Horizons.json`

### JSON Structure

Each downloaded file contains complete MTGJSON data:

```json
{
  "meta": {
    "date": "2023-12-01",
    "version": "5.2.0+20231201"
  },
  "data": {
    "name": "Limited Edition Alpha",
    "code": "LEA",
    "releaseDate": "1993-08-05",
    "type": "core",
    "baseSetSize": 295,
    "totalSetSize": 295,
    "cards": [
      {
        "name": "Black Lotus",
        "manaCost": "{0}",
        "type": "Artifact",
        "text": "{T}, Sacrifice Black Lotus: Add three mana of any one color.",
        "power": null,
        "toughness": null,
        "rarity": "rare",
        "artist": "Christopher Rush",
        "uuid": "...",
        "identifiers": {...},
        "legalities": {...},
        "purchaseUrls": {...}
      }
      // ... all other cards
    ],
    "tokens": [...],
    "translations": {...}
  }
}
```

## Features in Detail

### Smart Set Matching

The script uses multiple strategies to find sets:

1. **Exact Name Match**: "Limited Edition Alpha" → LEA
2. **Partial Name Match**: "Alpha" → Limited Edition Alpha
3. **Set Code Match**: "LEA" → Limited Edition Alpha
4. **Fuzzy Matching**: "Limtied Alpha" → Limited Edition Alpha (typo handling)

### Error Handling & Suggestions

When a set isn't found, the script provides helpful suggestions:

```bash
$ node mtgjson-downloader.js "Unlimited"

❌ Set "Unlimited" not found.

🔍 Did you mean one of these?
1. Unlimited Edition (2ED) - 1993-12-01
2. Unhinged (UNH) - 2004-11-20
3. Unglued (UGL) - 1998-08-11
```

### Set Information Display

For each downloaded set, the script shows:

```
📋 Set Information:
Name: Limited Edition Alpha
Code: LEA
Release Date: 1993-08-05
Type: core
Total Cards: 295
Base Set Size: 295
Cards in JSON: 295
Tokens: 0

🃏 Sample Cards:
1. Animate Wall ({W}) - Enchantment — Aura
2. Armageddon ({3}{W}) - Sorcery
3. Balance ({1}{W}) - Sorcery
4. Benalish Hero ({W}) - Creature — Human Soldier
5. Black Ward ({W}) - Enchantment — Aura
... and 290 more cards
```

## Advanced Usage

### Programmatic Usage

You can also use the script as a module:

```javascript
const MTGJSONDownloader = require("./mtgjson-downloader");

const downloader = new MTGJSONDownloader();

// Download a set
const success = await downloader.downloadSet("Innistrad");

// List all sets
const sets = await downloader.getAllSets();

// Find similar sets
const similar = downloader.findSimilarSets(sets, "Modern", 10);
```

### Custom Output Directory

Modify the script to change the output directory:

```javascript
const downloader = new MTGJSONDownloader();
downloader.outputDir = "./my-custom-directory";
```

## Troubleshooting

### Common Issues

**"Could not retrieve set list from MTGJSON"**

- Check your internet connection
- MTGJSON might be temporarily unavailable
- Try again in a few minutes

**"Request timeout"**

- Large sets may take time to download
- Check your internet connection
- The script has a 60-second timeout

**"Failed to parse JSON"**

- The downloaded data might be corrupted
- Try downloading again
- Check if MTGJSON is experiencing issues

### Set Not Found

If a set isn't found:

1. Check the exact spelling on [mtgjson.com](https://mtgjson.com/downloads/all-sets/)
2. Try using the set code instead
3. Use partial matching (e.g., "Alpha" instead of "Limited Edition Alpha")
4. Use `--list` to see all available sets

### File Permissions

If you get permission errors:

```bash
# Make sure the script is executable
chmod +x mtgjson-downloader.js

# Check write permissions for output directory
ls -la ./downloaded-sets/
```

## Data Source

This script downloads data from [MTGJSON](https://mtgjson.com/), an open-source project that provides comprehensive Magic: The Gathering data in portable formats.

- **Data Updates**: MTGJSON updates daily
- **API Version**: Uses MTGJSON v5 API
- **Data Completeness**: Includes all official Magic cards, sets, and metadata

## Set Types Available

The script can download any set type available on MTGJSON:

- **Core Sets**: Magic 2015, Magic 2014, etc.
- **Expansion Sets**: Standard legal expansions
- **Masters Sets**: Reprint sets like Modern Masters
- **Supplemental Sets**: Commander, Conspiracy, etc.
- **Un-Sets**: Unglued, Unhinged, Unstable
- **Historic Sets**: Alpha, Beta, Unlimited, etc.
- **Digital Sets**: Arena-only releases
- **Promo Sets**: Various promotional sets

## License

This script is provided as-is for educational and personal use. MTGJSON data is provided under their license terms. Magic: The Gathering is a trademark of Wizards of the Coast.

## Contributing

Feel free to improve this script by:

- Adding new features
- Improving error handling
- Optimizing performance
- Adding tests
- Improving documentation

---

_Made with ❤️ for the Magic: The Gathering community_
