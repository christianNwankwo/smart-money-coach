"use client";

import { createContext, useContext } from "react";
import type { MarketConfig } from "@/markets/types";
import { marketConfig } from "@/market";

const MarketCtx = createContext<MarketConfig>(marketConfig);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  return <MarketCtx.Provider value={marketConfig}>{children}</MarketCtx.Provider>;
}

/** Access the active market config from any client component. */
export function useMarket(): MarketConfig {
  return useContext(MarketCtx);
}
