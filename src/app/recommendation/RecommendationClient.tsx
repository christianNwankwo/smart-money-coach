"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { generateRecommendation } from "@/lib/recommendation";
import { loadProfile } from "@/lib/storage";
import type { FinancialProfile, RecommendationResult } from "@/types/financial";

export default function RecommendationClient() {
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const data = loadProfile();
    setProfile(data);
    if (data) {
      setResult(generateRecommendation(data));
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile || !result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">No profile found</h1>
        <p className="mt-2 text-slate-600">
          Complete the form on the homepage to get your personalized recommendation.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
        >
          Go to homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-medium uppercase tracking-wider text-emerald-600">
        Your plan
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Recommendation
      </h1>

      <section className="mt-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg sm:p-8">
        <h2 className="text-lg font-semibold text-emerald-900">Summary</h2>
        <p className="mt-3 text-lg leading-relaxed text-slate-800">
          {result.recommendation}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Why</h2>
        <p className="mt-3 leading-relaxed text-slate-600">{result.why}</p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Suggested Priority Order
        </h2>
        <ol className="mt-4 space-y-3">
          {result.priorityOrder.map((item, i) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 text-slate-800">{item}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">3 Next Actions</h2>
        <ul className="mt-4 space-y-4">
          {result.nextActions.map((action, i) => (
            <li key={action} className="flex gap-3">
              <span className="mt-1 text-emerald-600">✓</span>
              <span className="text-slate-700">
                <span className="font-medium text-slate-900">Step {i + 1}:</span>{" "}
                {action}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ProfileSnapshot profile={profile} />
    </div>
  );
}

function ProfileSnapshot({ profile }: { profile: FinancialProfile }) {
  const rows: [string, string][] = [
    ["Age", String(profile.age)],
    ["Household income", `$${profile.householdIncome.toLocaleString()}`],
    ["Mortgage", `$${profile.mortgageBalance.toLocaleString()} @ ${profile.mortgageInterestRate}%`],
    ["Retirement + match", `${profile.retirementContributionPct + profile.employerMatchPct}%`],
    ["Savings / other debt", `$${profile.savingsAmount.toLocaleString()} / $${profile.otherDebt.toLocaleString()}`],
    ["Risk tolerance", profile.riskTolerance],
    ["Goal", profile.financialGoal],
  ];

  return (
    <details className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-600">
        View submitted inputs
      </summary>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
