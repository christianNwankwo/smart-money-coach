"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { saveProfile } from "@/lib/storage";
import type { FinancialProfile, RiskTolerance } from "@/types/financial";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

export default function FinancialForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const profile = parseForm(form);

    if (!profile) {
      setError("Please fill in all required fields with valid numbers.");
      return;
    }

    saveProfile(profile);
    router.push("/recommendation");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/50 backdrop-blur sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Age" name="age" type="number" min={18} max={100} required />
        <Field
          label="Household Income ($/year)"
          name="householdIncome"
          type="number"
          min={0}
          step={1000}
          required
        />
        <Field
          label="Mortgage Balance ($)"
          name="mortgageBalance"
          type="number"
          min={0}
          step={1000}
          required
        />
        <Field
          label="Mortgage Interest Rate (%)"
          name="mortgageInterestRate"
          type="number"
          min={0}
          max={30}
          step={0.01}
          required
        />
        <Field
          label="Monthly Mortgage Payment ($)"
          name="monthlyMortgagePayment"
          type="number"
          min={0}
          step={50}
          required
        />
        <Field
          label="Retirement Contribution (%)"
          name="retirementContributionPct"
          type="number"
          min={0}
          max={100}
          step={0.5}
          required
        />
        <Field
          label="Employer Match (%)"
          name="employerMatchPct"
          type="number"
          min={0}
          max={100}
          step={0.5}
          required
        />
        <Field
          label="Savings Amount ($)"
          name="savingsAmount"
          type="number"
          min={0}
          step={500}
          required
        />
        <Field
          label="Other Debt ($)"
          name="otherDebt"
          type="number"
          min={0}
          step={500}
          required
        />
        <div>
          <label htmlFor="riskTolerance" className={labelClass}>
            Risk Tolerance
          </label>
          <select
            id="riskTolerance"
            name="riskTolerance"
            required
            className={inputClass}
            defaultValue="medium"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="financialGoal" className={labelClass}>
            Financial Goal
          </label>
          <input
            id="financialGoal"
            name="financialGoal"
            type="text"
            required
            placeholder="e.g. Retire by 60, pay off home in 10 years"
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-8 w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.99]"
      >
        Get Recommendation
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <input id={name} name={name} className={inputClass} {...props} />
    </div>
  );
}

function parseForm(form: FormData): FinancialProfile | null {
  const age = num(form.get("age"));
  const householdIncome = num(form.get("householdIncome"));
  const mortgageBalance = num(form.get("mortgageBalance"));
  const mortgageInterestRate = num(form.get("mortgageInterestRate"));
  const monthlyMortgagePayment = num(form.get("monthlyMortgagePayment"));
  const retirementContributionPct = num(form.get("retirementContributionPct"));
  const employerMatchPct = num(form.get("employerMatchPct"));
  const savingsAmount = num(form.get("savingsAmount"));
  const otherDebt = num(form.get("otherDebt"));
  const riskTolerance = form.get("riskTolerance") as RiskTolerance;
  const financialGoal = String(form.get("financialGoal") ?? "").trim();

  const numbers = [
    age,
    householdIncome,
    mortgageBalance,
    mortgageInterestRate,
    monthlyMortgagePayment,
    retirementContributionPct,
    employerMatchPct,
    savingsAmount,
    otherDebt,
  ];

  if (numbers.some((n) => n === null || n < 0)) return null;
  if (!["low", "medium", "high"].includes(riskTolerance)) return null;
  if (!financialGoal) return null;

  return {
    age: age!,
    householdIncome: householdIncome!,
    mortgageBalance: mortgageBalance!,
    mortgageInterestRate: mortgageInterestRate!,
    monthlyMortgagePayment: monthlyMortgagePayment!,
    retirementContributionPct: retirementContributionPct!,
    employerMatchPct: employerMatchPct!,
    savingsAmount: savingsAmount!,
    otherDebt: otherDebt!,
    riskTolerance,
    financialGoal,
  };
}

function num(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
