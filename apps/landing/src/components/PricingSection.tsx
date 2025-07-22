"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { Button } from "@/components/ui/Button";
import { CONTRACTS, CARD_SET_ABI } from "@/lib/web3-config";
import { formatEther } from "@/lib/utils";

export function PricingSection() {
  const [selectedDeck, setSelectedDeck] = useState<string>("");

  // Read pack price
  const { data: packPrice } = useReadContract({
    address: CONTRACTS.CARD_SET,
    abi: CARD_SET_ABI,
    functionName: "packPrice",
  });

  // Read available deck types
  const { data: deckTypeNames } = useReadContract({
    address: CONTRACTS.CARD_SET,
    abi: CARD_SET_ABI,
    functionName: "getDeckTypeNames",
  });

  // Read selected deck price
  const { data: deckPrice } = useReadContract({
    address: CONTRACTS.CARD_SET,
    abi: CARD_SET_ABI,
    functionName: "getDeckPrice",
    args: selectedDeck ? [selectedDeck] : undefined,
    query: {
      enabled: !!selectedDeck,
    },
  });

  useEffect(() => {
    if (deckTypeNames && deckTypeNames.length > 0 && !selectedDeck) {
      setSelectedDeck(deckTypeNames[0]);
    }
  }, [deckTypeNames, selectedDeck]);

  return (
    <section className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Choose Your <span className="text-purple-400">Adventure</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Whether you're hunting for rare cards or building competitive decks,
            we have the perfect option for you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Packs Section */}
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-8 border border-purple-500/30 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-purple-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              MYSTERY
            </div>

            <div className="mb-6">
              <h3 className="text-3xl font-bold text-white mb-4">
                Booster Packs
              </h3>
              <div className="text-4xl font-bold text-purple-400 mb-4">
                {packPrice ? `${formatEther(packPrice)} MATIC` : "Loading..."}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">15 random cards per pack</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">
                  7 Commons, 6 Uncommons, 1 Rare guaranteed
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">
                  Lucky slot: chance for Mythical or Serialized!
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">
                  Powered by Chainlink VRF for true randomness
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">
                  Perfect for collectors hunting rare cards
                </span>
              </div>
            </div>

            <div className="bg-purple-800/30 rounded-lg p-4 mb-6">
              <p className="text-purple-200 text-sm">
                <strong>Best for:</strong> Collectors who love the thrill of
                discovery and want a chance at extremely rare serialized cards.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Open Pack
            </Button>
          </div>

          {/* Decks Section */}
          <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-8 border border-blue-500/30 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              READY TO PLAY
            </div>

            <div className="mb-6">
              <h3 className="text-3xl font-bold text-white mb-4">
                Preconstructed Decks
              </h3>
              <div className="text-4xl font-bold text-blue-400 mb-4">
                {deckPrice ? `${formatEther(deckPrice)} MATIC` : "Loading..."}
              </div>
              {deckTypeNames && deckTypeNames.length > 0 && (
                <select
                  className="bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-600"
                  value={selectedDeck}
                  onChange={(e) => setSelectedDeck(e.target.value)}
                >
                  {deckTypeNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">
                  60 cards in a balanced, playable deck
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">
                  Fixed composition - know exactly what you get
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">
                  Multiple themes and strategies available
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">
                  No serialized cards (preserves their rarity)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">
                  Perfect for competitive play
                </span>
              </div>
            </div>

            <div className="bg-blue-800/30 rounded-lg p-4 mb-6">
              <p className="text-blue-200 text-sm">
                <strong>Best for:</strong> Players who want to jump straight
                into battles with optimized, tournament-ready decks.
              </p>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={!selectedDeck}
            >
              Get Deck
            </Button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-16 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            Quick Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left py-4 px-4 text-gray-300">Feature</th>
                  <th className="text-center py-4 px-4 text-purple-400">
                    Packs
                  </th>
                  <th className="text-center py-4 px-4 text-blue-400">Decks</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700">
                  <td className="py-4 px-4">Cards per purchase</td>
                  <td className="text-center py-4 px-4">15</td>
                  <td className="text-center py-4 px-4">60</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-4 px-4">Content</td>
                  <td className="text-center py-4 px-4">Random</td>
                  <td className="text-center py-4 px-4">Fixed</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-4 px-4">Serialized cards possible</td>
                  <td className="text-center py-4 px-4 text-green-400">✓</td>
                  <td className="text-center py-4 px-4 text-red-400">✗</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-4 px-4">Immediately playable</td>
                  <td className="text-center py-4 px-4 text-red-400">✗</td>
                  <td className="text-center py-4 px-4 text-green-400">✓</td>
                </tr>
                <tr>
                  <td className="py-4 px-4">Best for</td>
                  <td className="text-center py-4 px-4">Collecting</td>
                  <td className="text-center py-4 px-4">Playing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
