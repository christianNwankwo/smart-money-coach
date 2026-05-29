import type { FinancialProfile } from "@/types/financial";
import { STORAGE_KEY } from "@/types/financial";

export function saveProfile(profile: FinancialProfile): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function loadProfile(): FinancialProfile | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FinancialProfile;
  } catch {
    return null;
  }
}
