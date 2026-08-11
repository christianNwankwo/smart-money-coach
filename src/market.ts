/**
 * Active market — config and tools resolved from the build-time env var.
 *
 * `NEXT_PUBLIC_MARKET=ng npm run build` targets Nigeria; the default is the US.
 * Only the active market's imports end up in the bundle — Next.js tree-shakes
 * the rest because the comparison is against a constant env var.
 */
import { usMarket } from "@/markets/us";
import { ngMarket } from "@/markets/ng";
import type { MarketConfig } from "@/markets/types";

export const MARKET = (process.env.NEXT_PUBLIC_MARKET ?? "us") as "us" | "ng";

const configs: Record<string, MarketConfig> = { us: usMarket, ng: ngMarket };
export const marketConfig = configs[MARKET];
