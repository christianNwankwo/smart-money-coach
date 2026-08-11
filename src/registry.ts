/**
 * Active market registry — re-exports from the market identified by
 * `NEXT_PUBLIC_MARKET` at build time.
 */
import { registry as us } from "@/markets/us/registry";
import { registry as ng } from "@/markets/ng/registry";

const MARKET = (process.env.NEXT_PUBLIC_MARKET ?? "us") as "us" | "ng";
const registries = { us, ng };
const reg = registries[MARKET];

export const { tools, categories, getTool, relatedTools, searchTools, toolsBySlug, toolsInCategory } = reg;

export type { Tool, Category, CategoryId, FaqItem } from "@/markets/types";
