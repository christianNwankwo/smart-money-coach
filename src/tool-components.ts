/**
 * Active market tool components — re-exports from the market identified by
 * `NEXT_PUBLIC_MARKET` at build time.
 */
import { getToolComponent as us } from "@/markets/us/tool-components";
import { getToolComponent as ng } from "@/markets/ng/tool-components";
import type { ComponentType } from "react";

const MARKET = (process.env.NEXT_PUBLIC_MARKET ?? "us") as "us" | "ng";
const getters = { us, ng };

export type ToolComponent = ComponentType;

export function getToolComponent(slug: string): ToolComponent | undefined {
  return getters[MARKET](slug);
}
