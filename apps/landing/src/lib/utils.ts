import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEther(wei: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const quotient = wei / divisor;
  const remainder = wei % divisor;

  if (remainder === 0n) {
    return quotient.toString();
  }

  const remainderStr = remainder.toString().padStart(decimals, "0");
  const trimmedRemainder = remainderStr.replace(/0+$/, "");

  return `${quotient}.${trimmedRemainder}`;
}

export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatNumber(num: number | bigint): string {
  const value = typeof num === "bigint" ? Number(num) : num;
  return new Intl.NumberFormat().format(value);
}
