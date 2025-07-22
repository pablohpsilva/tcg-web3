"use client";

import { useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { Button } from "@/components/ui/Button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CONTRACTS, CARD_SET_ABI } from "@/lib/web3-config";
import { formatEther } from "@/lib/utils";

export function PurchaseSection() {
  const { address, isConnected } = useAccount();
  const [selectedDeck, setSelectedDeck] = useState<string>("");
  const [purchaseType, setPurchaseType] = useState<"pack" | "deck" | null>(
    null
  );

  // Contract interactions
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Read contract data
  const { data: packPrice } = useReadContract({
    address: CONTRACTS.CARD_SET,
    abi: CARD_SET_ABI,
    functionName: "packPrice",
  });

  const { data: deckTypeNames } = useReadContract({
    address: CONTRACTS.CARD_SET,
    abi: CARD_SET_ABI,
    functionName: "getDeckTypeNames",
  });

  const { data: deckPrice } = useReadContract({
    address: CONTRACTS.CARD_SET,
    abi: CARD_SET_ABI,
    functionName: "getDeckPrice",
    args: selectedDeck ? [selectedDeck] : undefined,
    query: {
      enabled: !!selectedDeck,
    },
  });

  const handleOpenPack = async () => {
    if (!packPrice) return;

    setPurchaseType("pack");
    try {
      writeContract({
        address: CONTRACTS.CARD_SET,
        abi: CARD_SET_ABI,
        functionName: "openPack",
        value: packPrice,
      });
    } catch (err) {
      console.error("Pack opening failed:", err);
      setPurchaseType(null);
    }
  };

  const handleOpenDeck = async () => {
    if (!selectedDeck || !deckPrice) return;

    setPurchaseType("deck");
    try {
      writeContract({
        address: CONTRACTS.CARD_SET,
        abi: CARD_SET_ABI,
        functionName: "openDeck",
        args: [selectedDeck],
        value: deckPrice,
      });
    } catch (err) {
      console.error("Deck opening failed:", err);
      setPurchaseType(null);
    }
  };

  const getButtonState = () => {
    if (isPending || isConfirming) {
      return {
        disabled: true,
        loading: true,
        text: purchaseType === "pack" ? "Opening Pack..." : "Opening Deck...",
      };
    }

    if (isSuccess) {
      return {
        disabled: true,
        loading: false,
        text: "Success! Check your wallet",
      };
    }

    return {
      disabled: false,
      loading: false,
      text: "",
    };
  };

  if (!isConnected) {
    return (
      <section className="py-20 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-8">
            Ready to <span className="text-purple-400">Start Playing?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Connect your wallet to start opening packs and building your
            collection of epic trading cards.
          </p>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-12 border border-gray-700">
            <div className="text-6xl mb-6">🔗</div>
            <h3 className="text-2xl font-bold text-white mb-6">
              Connect Your Wallet
            </h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              You'll need a Web3 wallet to purchase and own your trading cards.
              We support all major wallets through RainbowKit.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const buttonState = getButtonState();

  return (
    <section className="py-20 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-8">
            Start Your <span className="text-purple-400">Collection</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Choose your path: hunt for rare cards with booster packs or get
            tournament-ready with preconstructed decks.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Pack Purchase */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Open a Pack
              </h3>
              <div className="text-4xl font-bold text-purple-400 mb-4">
                {packPrice ? `${formatEther(packPrice)} MATIC` : "Loading..."}
              </div>
              <p className="text-gray-400">
                15 random cards with a chance for mythical and serialized
                rarities
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-purple-900/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">
                  What you'll get:
                </h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• 7 Common cards</li>
                  <li>• 6 Uncommon cards</li>
                  <li>• 1 Rare card (guaranteed)</li>
                  <li>• 1 Lucky slot (5% chance for serialized!)</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={handleOpenPack}
              disabled={buttonState.disabled || !packPrice}
              loading={buttonState.loading && purchaseType === "pack"}
              size="lg"
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {purchaseType === "pack" && buttonState.text
                ? buttonState.text
                : "Open Pack"}
            </Button>
          </div>

          {/* Deck Purchase */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/30">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-3xl font-bold text-white mb-4">Get a Deck</h3>
              <div className="text-4xl font-bold text-blue-400 mb-4">
                {deckPrice ? `${formatEther(deckPrice)} MATIC` : "Loading..."}
              </div>

              {deckTypeNames && deckTypeNames.length > 0 && (
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">
                    Choose your deck:
                  </label>
                  <select
                    className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 w-full max-w-xs"
                    value={selectedDeck}
                    onChange={(e) => setSelectedDeck(e.target.value)}
                  >
                    <option value="">Select a deck...</option>
                    {deckTypeNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-gray-400">
                60 balanced cards ready for competitive play
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-blue-900/30 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">
                  What you'll get:
                </h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• 60 carefully balanced cards</li>
                  <li>• Fixed, optimized deck composition</li>
                  <li>• Ready for tournament play</li>
                  <li>• Multiple strategic themes available</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={handleOpenDeck}
              disabled={buttonState.disabled || !selectedDeck || !deckPrice}
              loading={buttonState.loading && purchaseType === "deck"}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              {purchaseType === "deck" && buttonState.text
                ? buttonState.text
                : "Get Deck"}
            </Button>
          </div>
        </div>

        {/* Transaction Status */}
        {(isPending || isConfirming || isSuccess || error) && (
          <div className="mt-12 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              Transaction Status
            </h3>

            {isPending && (
              <div className="text-center text-yellow-400">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                Confirming transaction...
              </div>
            )}

            {isConfirming && (
              <div className="text-center text-blue-400">
                <div className="animate-pulse inline-block w-6 h-6 bg-current rounded-full mr-2"></div>
                Waiting for blockchain confirmation...
              </div>
            )}

            {isSuccess && (
              <div className="text-center text-green-400">
                <div className="inline-block w-6 h-6 mr-2">✅</div>
                Success! Your {purchaseType} has been opened. Check your wallet
                for new NFTs!
              </div>
            )}

            {error && (
              <div className="text-center text-red-400">
                <div className="inline-block w-6 h-6 mr-2">❌</div>
                Error: {error.message}
              </div>
            )}

            {hash && (
              <div className="mt-4 text-center">
                <a
                  href={`https://polygonscan.com/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 text-sm underline"
                >
                  View on Polygonscan ↗
                </a>
              </div>
            )}
          </div>
        )}

        {/* Important Notes */}
        <div className="mt-16 bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-6 max-w-4xl mx-auto">
          <h3 className="text-yellow-400 font-bold mb-3">⚠️ Important Notes</h3>
          <ul className="text-yellow-200 text-sm space-y-2">
            <li>
              • Make sure you have enough MATIC for gas fees (usually
              ~$0.01-0.10)
            </li>
            <li>
              • Pack openings use Chainlink VRF for true randomness - this may
              take 1-2 minutes
            </li>
            <li>
              • All cards are ERC1155 NFTs that you truly own and can trade
            </li>
            <li>
              • Keep your private keys safe - we cannot recover lost wallets
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
