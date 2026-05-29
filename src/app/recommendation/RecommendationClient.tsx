"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CoachText } from "@/components/CoachText";
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
        Your personalized plan
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Coach recommendation
      </h1>
      <p className="mt-3 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
        Primary focus: {result.focusArea}
      </p>

      <section className="mt-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg sm:p-8">
        <h2 className="text-lg font-semibold text-emerald-900">
          Recommendation summary
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-slate-800">{result.summary}</p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Personalized why</h2>
        <CoachText
          className="mt-3 leading-relaxed text-slate-600"
          children={result.personalizedWhy}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Suggested strategy</h2>
        <CoachText
          className="mt-3 leading-relaxed text-slate-700"
          children={result.suggestedStrategy}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-amber-950">Risks & tradeoffs</h2>
        <CoachText
          className="mt-3 leading-relaxed text-amber-900/90"
          children={result.risksAndTradeoffs}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">3 next actions</h2>
        <ol className="mt-4 space-y-4">
          {result.nextActions.map((action, i) => (
            <li
              key={action}
              className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <p className="pt-1 text-slate-700">{action}</p>
            </li>
          ))}
        </ol>
      </section>

      <ProfileSnapshot profile={profile} />
    </div>
  );
}

function ProfileSnapshot({ profile }: { profile: FinancialProfile }) {
  const effective =
    profile.retirementContributionPct + profile.employerMatchPct;
  const monthlyIncome = profile.householdIncome / 12;
  const savingsMonths =
    monthlyIncome > 0
      ? (profile.savingsAmount / monthlyIncome).toFixed(1)
      : "—";

  const rows: [string, string][] = [
    ["Age", String(profile.age)],
    ["Household income", `$${profile.householdIncome.toLocaleString()}/yr`],
    [
      "Mortgage",
      `$${profile.mortgageBalance.toLocaleString()} @ ${profile.mortgageInterestRate}% ($${profile.monthlyMortgagePayment.toLocaleString()}/mo)`,
    ],
    [
      "Retirement",
      `${profile.retirementContributionPct}% you + ${profile.employerMatchPct}% match (${effective}% total)`,
    ],
    [
      "Savings / debt",
      `$${profile.savingsAmount.toLocaleString()} (~${savingsMonths} mo) / $${profile.otherDebt.toLocaleString()} debt`,
    ],
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
