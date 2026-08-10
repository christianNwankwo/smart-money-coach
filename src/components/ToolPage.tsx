import Link from "next/link";
import { Suspense } from "react";
import type { Tool, Category } from "@/registry";
import type { ToolComponent } from "@/tool-components";
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";

function jsonLd(tool: Tool): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": ["WebApplication", "FAQPage"],
    name: `${tool.title} — Smart Money Coach`,
    description: tool.blurb,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    mainEntity: tool.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  });
}

export default function ToolPage({
  tool,
  category,
  related,
  toolComponent: ToolComponent,
}: {
  tool: Tool;
  category: Category;
  related: Tool[];
  toolComponent: ToolComponent;
}) {
  return (
    <Layout variant="tool">
      {/* Category badge */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium
          text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/25
          hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
      >
        {category.label}
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        {tool.title}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-500 dark:text-slate-400">
        {tool.blurb}
      </p>

      {/* The tool itself */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <Suspense fallback={<ToolSkeleton />}>
          <ErrorBoundary>
            <ToolComponent />
          </ErrorBoundary>
        </Suspense>
      </section>

      {/* Structured data — server-rendered into the static HTML for crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(tool) }}
      />

      {/* How to use */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          How to use this tool
        </h2>
        <ol className="mt-4 space-y-3">
          {tool.how.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {i + 1}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      {tool.faq.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Common questions
          </h2>
          <dl className="mt-4 space-y-6">
            {tool.faq.map((item, i) => (
              <div key={i}>
                <dt className="font-medium text-slate-800 dark:text-slate-200">
                  {item.q}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Related tools */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Related tools
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/tools/${r.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition
                  hover:border-emerald-300 hover:shadow-md dark:border-slate-700
                  dark:bg-slate-800 dark:hover:border-emerald-600"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white">{r.title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{r.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}

/** Minimal skeleton that mirrors the tool form shape — avoids the layout jump. */
function ToolSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-9 rounded-lg bg-slate-100 dark:bg-slate-700" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-700" />
        ))}
      </div>
    </div>
  );
}
