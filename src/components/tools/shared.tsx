/** Shared UI for every tool component. */

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
        {value}
      </dd>
      {detail && (
        <dd className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{detail}</dd>
      )}
    </div>
  );
}

export function ResultRow({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          accent ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"
        }`}
      >
        {value}
      </div>
      {detail && <div className="text-xs text-slate-400 dark:text-slate-500">{detail}</div>}
    </div>
  );
}

export interface FieldConfig {
  key: string;
  label: string;
  unit: string;
  value: number;
  set: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function fieldDef(
  label: string,
  unit: string,
  key: string,
  value: number,
  set: (v: number) => void,
  opts?: { min?: number; max?: number; step?: number }
): FieldConfig {
  return { key, label, unit, value, set, ...opts };
}

export const fmt = {
  dollars(n: number): string {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: n === Math.round(n) && n < 1000 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  },
  plain(n: number): string {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },
  pct(n: number): string {
    if (!Number.isFinite(n)) return "—";
    return `${(n * 100).toFixed(1)}%`;
  },
  months(total: number): string {
    if (!Number.isFinite(total)) return "—";
    const y = Math.floor(total / 12);
    const m = total % 12;
    const parts: string[] = [];
    if (y > 0) parts.push(`${y}y`);
    if (m > 0 || parts.length === 0) parts.push(`${m}mo`);
    return parts.join(" ");
  },
};
