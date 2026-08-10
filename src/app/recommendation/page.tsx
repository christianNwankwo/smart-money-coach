import type { Metadata } from "next";
import Layout from "@/components/Layout";
import RecommendationClient from "./RecommendationClient";

export const metadata: Metadata = {
  title: "Quick Check — Get a plan from your numbers",
  description:
    "Fill a one-page profile and get an illustrated financial plan. Every figure is computed from your numbers — no advice, just arithmetic.",
};

export default function RecommendationPage() {
  return (
    <Layout variant="narrow">
      <RecommendationClient />
    </Layout>
  );
}
