import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TCG Magic - Epic Trading Card Game",
  description:
    "Discover the ultimate blockchain-based trading card game. Open packs, build decks, and collect rare serialized cards on Polygon.",
  keywords: ["TCG", "trading cards", "NFT", "blockchain", "game", "Polygon"],
  openGraph: {
    title: "TCG Magic - Epic Trading Card Game",
    description: "Discover the ultimate blockchain-based trading card game",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
