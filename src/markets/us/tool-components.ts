import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

export type ToolComponent = ComponentType;

const toolComponentMap: Record<string, LazyExoticComponent<ToolComponent>> = {
  "mortgage-deep-dive": lazy(
    () => import("@/markets/us/tools/MortgageDeepDive")
  ),
  "debt-payoff": lazy(() => import("@/markets/us/tools/DebtPayoff")),
  "refinance-break-even": lazy(
    () => import("@/markets/us/tools/RefinanceBreakEven")
  ),
};

export function getToolComponent(slug: string): ToolComponent | undefined {
  return (toolComponentMap as Record<string, ToolComponent>)[slug];
}
