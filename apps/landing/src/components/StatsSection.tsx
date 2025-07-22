"use client";

import { useReadContract, useAccount } from "wagmi";
import { CONTRACTS, CARD_SET_ABI } from "@/lib/web3-config";
import { formatNumber } from "@/lib/utils";

export function StatsSection() {
  const { address } = useAccount();

  // Read set information
  const { data: setInfo } = useReadContract({
    address: CONTRACTS.CARD_SET,
    abi: CARD_SET_ABI,
    functionName: "getSetInfo",
  });

  // Read user stats if connected
  const { data: userStats } = useReadContract({
    address: CONTRACTS.CARD_SET,
    abi: CARD_SET_ABI,
    functionName: "getUserStats",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const emissionProgress = setInfo
    ? (Number(setInfo.totalEmission) / Number(setInfo.emissionCap)) * 100
    : 0;

  const remainingCards = setInfo
    ? Number(setInfo.emissionCap) - Number(setInfo.totalEmission)
    : 0;

  const remainingPacks = Math.floor(remainingCards / 15);

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Live Game <span className="text-purple-400">Statistics</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Track the pulse of the TCG Magic universe in real-time. All data is
            pulled directly from the blockchain.
          </p>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-3xl font-bold text-white mb-2">
              {setInfo ? formatNumber(setInfo.totalEmission) : "---"}
            </div>
            <div className="text-gray-400">Cards Minted</div>
            <div className="text-sm text-purple-400 mt-1">
              of {setInfo ? formatNumber(setInfo.emissionCap) : "---"} total
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-3xl font-bold text-white mb-2">
              {remainingPacks ? formatNumber(remainingPacks) : "---"}
            </div>
            <div className="text-gray-400">Packs Remaining</div>
            <div className="text-sm text-blue-400 mt-1">
              {remainingCards} cards left
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-3xl font-bold text-white mb-2">
              {emissionProgress.toFixed(1)}%
            </div>
            <div className="text-gray-400">Set Completion</div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(emissionProgress, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-3xl font-bold text-white mb-2">
              {setInfo?.isLocked ? "Locked" : "Active"}
            </div>
            <div className="text-gray-400">Set Status</div>
            <div
              className={`text-sm mt-1 ${
                setInfo?.isLocked ? "text-red-400" : "text-green-400"
              }`}
            >
              {setInfo?.isLocked
                ? "No new cards can be added"
                : "Cards can still be added"}
            </div>
          </div>
        </div>

        {/* User Stats (if connected) */}
        {address && userStats && (
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-8 border border-purple-500/30 mb-16">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              Your Stats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">
                  {formatNumber(userStats[0])}
                </div>
                <div className="text-gray-300">Packs Opened</div>
                <div className="text-sm text-gray-400 mt-1">
                  ≈ {formatNumber(Number(userStats[0]) * 15)} cards collected
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">
                  {formatNumber(userStats[1])}
                </div>
                <div className="text-gray-300">Decks Opened</div>
                <div className="text-sm text-gray-400 mt-1">
                  ≈ {formatNumber(Number(userStats[1]) * 60)} deck cards
                  collected
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emission Progress Visualization */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            Emission Progress
          </h3>

          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>0 cards</span>
              <span>
                {setInfo ? formatNumber(setInfo.emissionCap) : "---"} cards
                (cap)
              </span>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-4 mb-4 overflow-hidden">
              <div
                className="h-4 rounded-full transition-all duration-1000 bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"
                style={{ width: `${Math.min(emissionProgress, 100)}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {setInfo ? formatNumber(setInfo.totalEmission) : "---"}
                </div>
                <div className="text-gray-400 text-sm">Cards Minted</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">
                  {formatNumber(remainingCards)}
                </div>
                <div className="text-gray-400 text-sm">Cards Remaining</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {setInfo ? formatNumber(setInfo.emissionCap) : "---"}
                </div>
                <div className="text-gray-400 text-sm">Total Cap</div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm max-w-2xl mx-auto">
              The emission cap ensures scarcity and value preservation. Once all
              cards are minted, no new cards from this set can ever be created,
              making your collection truly limited.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
