import type { Metadata } from "next";
import Layout from "@/components/Layout";
import { marketConfig } from "@/market";
import { QuickCheck } from "@/markets/active";

export const metadata: Metadata = marketConfig.hasQuickCheck
  ? {
      title: "Quick Check — Get a plan from your numbers",
      description:
        "Fill a one-page profile and get an illustrated financial plan. Every figure is computed from your numbers — no advice, just arithmetic.",
    }
  : {
      title: "Quick Check — not available here",
      robots: { index: false, follow: false },
    };

export default function RecommendationPage() {
  return (
    <Layout variant="narrow">
      <QuickCheck />
    </Layout>
  );
}
