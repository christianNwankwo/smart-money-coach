import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

export type ToolComponent = ComponentType;

const toolComponentMap: Record<string, LazyExoticComponent<ToolComponent>> = {
  "debt-payoff": lazy(() => import("@/markets/ng/tools/DebtPayoff")),
  "goal-saver": lazy(() => import("@/markets/ng/tools/GoalSaver")),
  "emergency-fund": lazy(() => import("@/markets/ng/tools/EmergencyFund")),
  "pension-cps": lazy(() => import("@/markets/ng/tools/PensionCps")),
};

export function getToolComponent(slug: string): ToolComponent | undefined {
  return (toolComponentMap as Record<string, ToolComponent>)[slug];
}
