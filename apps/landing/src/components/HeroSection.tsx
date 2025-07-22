"use client";

import { Button } from "@/components/ui/Button";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              TCG Magic
            </span>
          </h1>
          <p className="text-2xl sm:text-3xl text-gray-300 mb-8 max-w-4xl mx-auto">
            The Ultimate Blockchain Trading Card Game
          </p>
          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Collect rare cards, build powerful decks, and battle in the most
            epic TCG experience on Polygon. Every card is an NFT with provable
            rarity and true ownership.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button size="lg" className="text-xl px-12 py-4">
              Start Playing
            </Button>
            <ConnectButton />
          </div>
        </div>

        {/* Game Banner - TBD Placeholder */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Game Preview</h2>
            <p className="text-gray-400">
              Experience the magic of our trading card universe
            </p>
          </div>

          {/* Placeholder for game cards/sets banner */}
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-12 border-2 border-dashed border-gray-600">
            <div className="text-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {/* Card previews */}
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-700/50 rounded-lg p-6 h-48 flex items-center justify-center"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          C{i}
                        </span>
                      </div>
                      <p className="text-gray-300 font-medium">Epic Card {i}</p>
                      <p className="text-gray-500 text-sm">Mythical Rarity</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-gray-400 text-lg">
                🚧 Game banners and card artwork coming soon! 🚧
              </div>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
            <div className="text-purple-400 text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-3">Provably Fair</h3>
            <p className="text-gray-400">
              Powered by Chainlink VRF for true randomness in pack openings.
              Every card drop is verifiable on-chain.
            </p>
          </div>

          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
            <div className="text-blue-400 text-4xl mb-4">💎</div>
            <h3 className="text-xl font-bold text-white mb-3">
              True Ownership
            </h3>
            <p className="text-gray-400">
              All cards are ERC1155 NFTs on Polygon. Trade freely on any
              marketplace. You own your collection forever.
            </p>
          </div>

          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
            <div className="text-green-400 text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white mb-3">Low Gas Fees</h3>
            <p className="text-gray-400">
              Built on Polygon for lightning-fast transactions and minimal fees.
              Play without breaking the bank.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
