/**
 * Eager imports for the three tool components.
 *
 * In the toolbox repo this is `React.lazy` so the heavy libraries only download
 * when a tool is opened. It is still the right pattern, but with three tools
 * totalling ~15 kB each the payoff is smaller. Keeping it anyway so the
 * mechanism is in place when the suite grows.
 */
import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

export type ToolComponent = ComponentType;

const toolComponentMap: Record<string, LazyExoticComponent<ToolComponent>> = {
  "mortgage-deep-dive": lazy(
    () => import("@/components/tools/MortgageDeepDive")
  ),
  "debt-payoff": lazy(() => import("@/components/tools/DebtPayoff")),
  "refinance-break-even": lazy(
    () => import("@/components/tools/RefinanceBreakEven")
  ),
};

export function getToolComponent(slug: string): ToolComponent | undefined {
  return (toolComponentMap as Record<string, ToolComponent>)[slug];
}
