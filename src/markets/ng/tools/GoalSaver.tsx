"use client";

import { useMemo, useState } from "react";
import { planGoal } from "@/lib/finance/savings";
import { useFormat, fieldDef, StatTile } from "@/components/tools/shared";

export default function GoalSaver() {
  const f = useFormat();
  const [goal, setGoal] = useState(5_000_000);
  const [months, setMonths] = useState(18);
  const [inflationPct, setInflationPct] = useState(20);
  const [existingSavings, setExistingSavings] = useState(0);

  const result = useMemo(() => {
    try {
      return planGoal({
        goalToday: goal,
        months,
        annualInflationPct: inflationPct,
        existingSavings,
      });
    } catch {
      return null;
    }
  }, [goal, months, inflationPct, existingSavings]);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          fieldDef("Goal amount today", "goal", goal, setGoal, {
            min: 10_000,
            step: 100_000,
          }),
          fieldDef("Months to save", "time", months, setMonths, {
            min: 1,
            max: 120,
            step: 1,
          }),
          fieldDef("Inflation rate (%)", "inf", inflationPct, setInflationPct, {
            min: 0,
            max: 50,
            step: 1,
          }),
          fieldDef("Already saved", "saved", existingSavings, setExistingSavings, {
            min: 0,
            step: 50_000,
          }),
        ].map((fd) => (
          <label key={fd.key} className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {fd.label}
            </span>
            <input
              type="number"
              value={fd.value}
              step={fd.step}
              min={fd.min}
              max={fd.max}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) fd.set(v);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                text-slate-900 shadow-sm transition focus:border-emerald-500
                focus:outline-none focus:ring-2 focus:ring-emerald-500/20
                dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
        ))}
      </div>

      {result && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Inflated target"
              value={f.money(result.inflatedGoal)}
              detail={`${f.money(result.inflationPremium)} more than today's price`}
            />
            <StatTile
              label="Monthly to save"
              value={f.money(result.monthlyContribution)}
              detail={result.alreadyFunded ? "Already funded" : `for ${months} months`}
            />
            <StatTile
              label="Total you'll put in"
              value={f.money(result.totalContributed)}
              detail={`incl. ${f.money(existingSavings)} already set aside`}
            />
          </div>

          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
            <p className="font-medium text-amber-900 dark:text-amber-300">
              At {inflationPct}% inflation, {f.money(goal)} today becomes{" "}
              {f.money(result.inflatedGoal)} in {months} months.
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-400">
              Saving toward today&apos;s price would leave you{" "}
              {f.money(result.inflationPremium)} short. The target above is the
              inflated one, so the monthly figure is the amount that actually
              gets you there.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
