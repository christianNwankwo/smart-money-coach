import SiteHeader from "@/components/SiteHeader";
import RecommendationClient from "./RecommendationClient";

export default function RecommendationPage() {
  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <SiteHeader showBack />
      <RecommendationClient />
      <footer className="mt-auto border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        For educational purposes only — not financial advice.
      </footer>
    </div>
  );
}
