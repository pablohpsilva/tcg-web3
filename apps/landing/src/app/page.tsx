import { HeroSection } from "@/components/HeroSection";
import { PricingSection } from "@/components/PricingSection";
import { StatsSection } from "@/components/StatsSection";
import { PurchaseSection } from "@/components/PurchaseSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900">
      <HeroSection />
      <PricingSection />
      <StatsSection />
      <PurchaseSection />

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">TCG Magic</h3>
              <p className="text-gray-400 mb-4">
                The ultimate blockchain trading card game built on Polygon.
                Collect, trade, and battle with provably rare NFT cards.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Twitter
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Discord
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Game</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    How to Play
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Card Database
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Deck Builder
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Marketplace
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">
                Resources
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Smart Contracts
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Tokenomics
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 TCG Magic. Built with ❤️ on Polygon.</p>
            <p className="text-sm mt-2">
              Smart contracts are open source and audited. Play responsibly.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
