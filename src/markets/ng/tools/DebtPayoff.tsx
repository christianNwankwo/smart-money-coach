"use client";

// Imported from the module rather than the `@/lib/finance` barrel: the barrel
// re-exports every calculator, so pulling one function through it drags the
// mortgage and refinance engines into a market that has neither.
import { compareStrategies } from "@/lib/finance/debt-payoff";
import type { Debt } from "@/lib/finance/debt-payoff";
import { useMemo, useState } from "react";
import LineChart, { downsample } from "@/components/charts/LineChart";
import { useFormat, fieldDef } from "@/components/tools/shared";

let debtId = 0;
function nextId() {
  return `d${++debtId}`;
}

function newDebt(name: string, balance: number, rate: number, min: number): Debt {
  return { id: nextId(), name, balance, annualRatePct: rate, minimumPayment: min };
}

export default function DebtPayoff() {
  const f = useFormat();
  const [debts, setDebts] = useState<Debt[]>([
    newDebt("Loan app A", 150_000, 30, 15_000),
    newDebt("Loan app B", 80_000, 22, 8_000),
    newDebt("Personal loan", 300_000, 18, 25_000),
  ]);
  const [extraMonthly, setExtraMonthly] = useState(20_000);

  const updateDebt = (i: number, patch: Partial<Debt>) => {
    setDebts((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  const removeDebt = (i: number) => {
    setDebts((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addEmpty = () =>
    setDebts((prev) => [...prev, newDebt("", 0, 0, 0)]);

  const cmp = useMemo(() => {
    const valid = debts.filter(
      (d) => d.name.trim() && d.balance > 0 && d.minimumPayment > 0
    );
    if (valid.length < 2) return null;
    return compareStrategies(valid, extraMonthly);
  }, [debts, extraMonthly]);

  const chartData = useMemo(() => {
    if (!cmp) return null;
    const maxLen = Math.max(
      cmp.avalanche.months.length,
      cmp.snowball.months.length
    );
    const avalBalances = downsample(
      cmp.avalanche.months.map((m) => m.totalBalance),
      80
    );
    const snowBalances = downsample(
      cmp.snowball.months.map((m) => m.totalBalance),
      80
    );
    const xLabels: string[] = [];
    for (let i = 0; i < Math.max(avalBalances.length, snowBalances.length); i++) {
      xLabels.push(i === 0 ? "Start" : i % 6 === 0 ? `M${i}` : "");
    }
    return {
      series: [
        { id: "aval", label: "Avalanche", values: avalBalances, fill: false },
        { id: "snow", label: "Snowball", values: snowBalances, fill: false },
      ],
      xLabels,
    };
  }, [cmp]);

  return (
    <div>
      <div className="space-y-3">
        {debts.map((d, i) => (
          <div
            key={d.id}
            className="grid grid-cols-5 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <input
              type="text"
              placeholder="Name"
              value={d.name}
              onChange={(e) => updateDebt(i, { name: e.target.value })}
              className="rounded border border-slate-200 bg-white px-2 py-1.5 text-sm
                text-slate-900 transition focus:border-emerald-500 focus:outline-none
                focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600
                dark:bg-slate-800 dark:text-white"
            />
            <NInput value={d.balance} onChange={(v) => updateDebt(i, { balance: v })} placeholder="Balance" />
            <NInput value={d.annualRatePct} onChange={(v) => updateDebt(i, { annualRatePct: v })} placeholder="Rate %" step={0.5} />
            <NInput value={d.minimumPayment} onChange={(v) => updateDebt(i, { minimumPayment: v })} placeholder="Min/mo" />
            <button
              onClick={() => removeDebt(i)}
              className="rounded text-xs text-slate-400 hover:text-red-500"
              aria-label="Remove this debt"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addEmpty}
          className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:border-slate-400 dark:border-slate-600"
        >
          + Add a debt
        </button>
      </div>

      <div className="mt-4 max-w-xs">
        {[
          fieldDef("Extra per month", "extra", extraMonthly, setExtraMonthly, {
            min: 0,
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

      {cmp && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
              Avalanche saves {f.money(cmp.interestSaved)} in interest
            </h3>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
              {cmp.monthsSaved > 0
                ? `...and finishes ${cmp.monthsSaved} months sooner.`
                : cmp.monthsSaved === 0
                  ? "...both finish at the same time."
                  : `Snowball finishes ${Math.abs(cmp.monthsSaved)} months sooner.`}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PlanCard plan={cmp.avalanche} label="Avalanche" highlight f={f} />
            <PlanCard plan={cmp.snowball} label="Snowball" f={f} />
          </div>

          {chartData && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                Total balance over time
              </h3>
              <LineChart
                series={chartData.series}
                xLabels={chartData.xLabels}
                yLabel="Combined balance"
              />
            </div>
          )}

          {cmp.firstWin.avalanche && cmp.firstWin.snowball && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-slate-600 dark:text-slate-400">
                Snowball clears{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {cmp.firstWin.snowball.name}
                </span>{" "}
                in month {cmp.firstWin.snowball.month}
                {cmp.firstWin.snowball.month < cmp.firstWin.avalanche.month
                  ? ` — ${
                      cmp.firstWin.avalanche.month - cmp.firstWin.snowball.month
                    } months sooner than avalanche clears anything`
                  : " — same time as avalanche"}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NInput({
  value,
  onChange,
  placeholder,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder: string;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value || ""}
      step={step ?? 1}
      min={0}
      placeholder={placeholder}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        onChange(Number.isFinite(v) && v >= 0 ? v : 0);
      }}
      className="rounded border border-slate-200 bg-white px-2 py-1.5 text-sm
        text-slate-900 transition focus:border-emerald-500 focus:outline-none
        focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600
        dark:bg-slate-800 dark:text-white"
    />
  );
}

function PlanCard({
  plan,
  label,
  highlight = false,
  f,
}: {
  plan: NonNullable<ReturnType<typeof compareStrategies>>["avalanche"];
  label: string;
  highlight?: boolean;
  f: ReturnType<typeof useFormat>;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/25"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{label}</h4>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500 dark:text-slate-400">Debt-free in</dt>
          <dd className="tabular-nums font-medium text-slate-800 dark:text-slate-200">
            {f.months(plan.monthsToDebtFree)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500 dark:text-slate-400">Total interest</dt>
          <dd className="tabular-nums font-medium text-amber-700 dark:text-amber-400">
            {f.money(plan.totalInterest)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500 dark:text-slate-400">Total paid</dt>
          <dd className="tabular-nums font-medium text-slate-800 dark:text-slate-200">
            {f.money(plan.totalPaid)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500 dark:text-slate-400">Order</dt>
          <dd className="text-xs text-slate-600 dark:text-slate-400">
            {plan.order
              .map((id) => plan.perDebt.find((d) => d.id === id)?.name ?? id)
              .join(" → ")}
          </dd>
        </div>
      </dl>
    </div>
  );
}
