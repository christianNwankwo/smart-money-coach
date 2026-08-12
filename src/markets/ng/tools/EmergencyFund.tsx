"use client";

import { useMemo, useState } from "react";
import { planEmergencyFund } from "@/lib/finance/savings";
import { useFormat, fieldDef, StatTile } from "@/components/tools/shared";

export default function EmergencyFund() {
  const f = useFormat();
  const [monthlyExpenses, setMonthlyExpenses] = useState(150_000);
  const [targetMonths, setTargetMonths] = useState(3);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(30_000);

  const result = useMemo(() => {
    try {
      return planEmergencyFund({
        monthlyExpenses,
        targetMonths,
        currentSavings,
        monthlySavings,
      });
    } catch {
      return null;
    }
  }, [monthlyExpenses, targetMonths, currentSavings, monthlySavings]);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          fieldDef("Monthly expenses", "exp", monthlyExpenses, setMonthlyExpenses, {
            min: 10_000,
            step: 10_000,
          }),
          fieldDef("Target months of cushion", "mo", targetMonths, setTargetMonths, {
            min: 1,
            max: 12,
            step: 1,
          }),
          fieldDef("Already saved", "saved", currentSavings, setCurrentSavings, {
            min: 0,
            step: 10_000,
          }),
          fieldDef("Saving per month", "rate", monthlySavings, setMonthlySavings, {
            min: 1_000,
            step: 5_000,
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
              label="Your target"
              value={f.money(result.target)}
              detail={`${targetMonths} months at ${f.money(monthlyExpenses)}/mo`}
            />
            <StatTile
              label="Still needed"
              value={f.money(result.gap)}
              detail={
                result.fullyFunded
                  ? `covers ${result.monthsCovered.toFixed(1)} months`
                  : "Gap to close"
              }
            />
            <StatTile
              label="Time to reach"
              value={
                result.fullyFunded
                  ? "Already funded"
                  : result.monthsToTarget === null
                    ? "Never"
                    : `${result.monthsToTarget} months`
              }
              detail={
                result.fullyFunded
                  ? ""
                  : result.monthsToTarget === null
                    ? "nothing is being saved each month"
                    : `at ${f.money(monthlySavings)}/mo`
              }
            />
          </div>

          {result.fullyFunded && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="font-medium text-emerald-900 dark:text-emerald-300">
                Fully funded — {f.money(currentSavings)} covers{" "}
                {result.monthsCovered.toFixed(1)} months of expenses, past your{" "}
                {targetMonths}-month target.
              </p>
            </div>
          )}
        </>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="text-slate-600 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200">Where to keep it:</strong> A separate
          savings account — not your current account. Separation is what makes it a fund.
          A money market or high-yield savings account that earns some interest without
          locking the money away is ideal.
        </p>
      </div>
    </div>
  );
}
