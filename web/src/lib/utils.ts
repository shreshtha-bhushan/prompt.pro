import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function clerkToUuid(clerkId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(clerkId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return [
    hashHex.substring(0, 8),
    hashHex.substring(8, 12),
    '4' + hashHex.substring(13, 16),
    '8' + hashHex.substring(17, 20),
    hashHex.substring(20, 32)
  ].join('-');
}
