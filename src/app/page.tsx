import FinancialForm from "@/components/FinancialForm";
import SiteHeader from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-100">
      <SiteHeader />

      <main className="flex-1">
        <section className="px-4 pb-4 pt-10 text-center sm:px-6 sm:pt-14">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Smart Money Coach
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Personalized investing and mortgage decision support
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <p className="mb-6 text-center text-sm text-slate-400">
            Tell us about your finances — we&apos;ll suggest where to focus next.
          </p>
          <FinancialForm />
        </section>
      </main>

      <footer className="border-t border-slate-200/50 bg-slate-100 py-6 text-center text-xs text-slate-500">
        For educational purposes only — not financial advice.
      </footer>
    </div>
  );
}
