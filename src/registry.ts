/**
 * The active market's registry.
 *
 * Re-exported from the generated `@/markets/active` barrel so only one market's
 * tools are reachable from the bundle — see scripts/active-market.mjs.
 */
export {
  tools,
  categories,
  getTool,
  relatedTools,
  searchTools,
  toolsBySlug,
  toolsInCategory,
} from "@/markets/active";

export type { Tool, Category, CategoryId, FaqItem } from "@/markets/types";
