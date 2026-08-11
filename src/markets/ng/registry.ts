/**
 * Nigerian tool registry.
 *
 * Tools chosen for how people actually manage money in Nigeria: cooperative
 * savings, incremental housing, loan apps, and the CPS pension system.
 * Mortgage tools that dominate the US set are absent because a traditional
 * 30-year fixed-rate mortgage is not how most Nigerians acquire housing.
 */
import type { Category, CategoryId, FaqItem, Tool } from "@/markets/types";

const NOT_ADVICE =
  "These are arithmetic illustrations, not advice. They use only the " +
  "numbers you typed — not your employment status, family obligations, or " +
  "anything else a person who knows you would weigh.";

export const categories: Category[] = [
  {
    id: "debt",
    label: "Debt",
    blurb:
      "Loan apps, personal debt — what it costs to carry and how fast you can clear it.",
    accent: "bg-sky-500/10 text-sky-700",
  },
  {
    id: "savings",
    label: "Savings & Planning",
    blurb:
      "What to put aside for a goal, how long it takes, and what a safe cushion looks like in Naira.",
    accent: "bg-emerald-500/10 text-emerald-700",
  },
  {
    id: "housing",
    label: "Housing",
    blurb:
      "Building incrementally — the most common path to home ownership in Nigeria.",
    accent: "bg-amber-500/10 text-amber-700",
  },
  {
    id: "pension",
    label: "Pension",
    blurb:
      "Your CPS / Retirement Savings Account — what is being deducted and what it is worth.",
    accent: "bg-violet-500/10 text-violet-700",
  },
];

export const tools: Tool[] = [
  {
    slug: "debt-payoff",
    category: "debt",
    title: "Debt Payoff",
    blurb:
      "Avalanche against snowball on your actual balances — see what loan apps and personal debts are really costing you.",
    keywords: [
      "loan payoff",
      "debt calculator",
      "PalmCredit",
      "Carbon",
      "FairMoney",
      "pay off loan",
      "debt free date",
      "avalanche method",
      "snowball method",
    ],
    how: [
      "List each debt — give it a name, the balance, the interest rate, and the minimum monthly repayment.",
      "Add any extra naira you can throw at debt each month.",
      "Compare avalanche (highest rate first) against snowball (smallest balance first).",
      "The first cleared account date is shown — that quick win is often what keeps the plan going.",
    ],
    faq: [
      {
        q: "Which should I choose, avalanche or snowball?",
        a:
          "Avalanche always costs less in interest — that is arithmetic, not opinion. But snowball clears an account sooner, and seeing a balance hit zero is what keeps many people going. The tool shows both numbers so you can see the exact trade.",
      },
      {
        q: "Why are the rates on loan apps so high?",
        a:
          "Digital lenders in Nigeria operate in a high-inflation environment with limited credit history data. Rates of 15–50% per year are normal for unsecured personal loans. The tool does not judge — it just shows you what those rates cost in Naira over time.",
      },
      {
        q: "What if my repayment doesn't cover the interest?",
        a:
          "Then the balance grows even as you pay. The tool will tell you this and name the account — that is a signal to contact the lender, not to budget harder. " +
          NOT_ADVICE,
      },
      {
        q: "Should I pay debt or save?",
        a:
          "Compare the interest rate on the debt against what your savings earn. If the debt is at 30% and your savings earn 10%, paying the debt is a guaranteed 30% return. But a small cushion is safety — the Emergency Fund tool helps with that balance.",
      },
    ],
  },
  {
    slug: "goal-saver",
    category: "savings",
    title: "Goal Saver",
    blurb:
      "How much to put aside each month for rent, school fees, a wedding, or a piece of land — with inflation factored in.",
    keywords: [
      "save for goal",
      "savings target",
      "save for rent",
      "school fees",
      "wedding savings",
      "land savings",
      "ajo",
      "esusu",
      "target savings",
    ],
    how: [
      "Enter your goal amount — what the thing costs today.",
      "Set your timeline: how many months until you need the money.",
      "Add an expected inflation rate so the target stays realistic as prices rise.",
      "The tool tells you the monthly contribution and what the inflated target will be.",
    ],
    faq: [
      {
        q: "Why does inflation matter for a savings goal?",
        a:
          "Because ₦500,000 today might buy a plot of land, but in 18 months at 20% inflation, the same plot might cost ₦672,000. If you save toward today's price, you will come up short. The tool inflates the target so you are saving toward the right number.",
      },
      {
        q: "How is this different from ajo or esusu?",
        a:
          "Ajo and esusu are cooperative savings — you contribute to a pool and take turns receiving the lump sum. This tool models saving on your own. Both approaches work, and many people use both. The tool does not replace ajo — it helps you decide how much to set aside regardless of the method.",
      },
      {
        q: "What rate of inflation should I use?",
        a:
          "Nigeria's headline inflation has been 15–34% in recent years. The tool defaults to 20%. If your goal is priced in dollars (school fees abroad, electronics), use a lower rate — the naira's exchange rate is a different risk. " +
          NOT_ADVICE,
      },
    ],
  },
  {
    slug: "emergency-fund",
    category: "savings",
    title: "Emergency Fund",
    blurb:
      "How much you need to cover a few months without income — calibrated to Nigerian household costs.",
    keywords: [
      "emergency fund",
      "savings cushion",
      "how much to save",
      "financial safety net",
      "rainy day fund",
      "emergency savings Nigeria",
    ],
    how: [
      "Enter your monthly expenses — rent, food, transport, utilities, family support.",
      "Set how many months of cushion you want (3 months is a common starting point).",
      "The tool shows the target and how long it takes to reach it at your savings rate.",
      "Adjust the monthly savings amount to see how the timeline shifts.",
    ],
    faq: [
      {
        q: "How many months of expenses do I need?",
        a:
          "In Nigeria, where formal unemployment benefits are limited and family obligations can be sudden, three months is a realistic first target. Six months is stronger but takes longer to build. Start with three and grow from there.",
      },
      {
        q: "Should this be in naira or dollars?",
        a:
          "Most household expenses are in naira, so the fund should be too. Keeping emergency savings in dollars exposes you to exchange rate gains and losses when you need the money immediately. The point is access, not return.",
      },
      {
        q: "Where should I keep this money?",
        a:
          "A separate savings account, ideally one that earns some interest but does not lock the money away. The key is separation — if your emergency fund and your current account are the same number, it is not a fund, it is a balance. " +
          NOT_ADVICE,
      },
    ],
  },
  {
    slug: "pension-cps",
    category: "pension",
    title: "Pension CPS Analyzer",
    blurb:
      "What your Retirement Savings Account is worth and what it could be at retirement — see the deductions on your payslip in a new light.",
    keywords: [
      "pension calculator",
      "CPS",
      "RSA",
      "retirement savings",
      "PenCom",
      "pension contribution",
      "retirement account Nigeria",
    ],
    how: [
      "Enter your monthly salary and total pension contribution rate (from your payslip).",
      "Add your current RSA balance if you know it.",
      "Set how many years until retirement.",
      "The tool projects what the account could be worth, in today's naira.",
    ],
    faq: [
      {
        q: "What is the CPS / RSA?",
        a:
          "The Contributory Pension Scheme requires employees to contribute a minimum of 8% of salary (employee + employer) into a Retirement Savings Account managed by a PFA. The money is invested and accessible at retirement or under specific conditions. You see the deductions every month — this tool shows what they add up to.",
      },
      {
        q: "Why does the projection show 'today's naira'?",
        a:
          "A naira figure 20 years from now is misleading without adjusting for inflation. The tool discounts the projection to today's purchasing power so you can actually picture what the number means.",
      },
      {
        q: "Can I withdraw before retirement?",
        a:
          "Under PenCom rules, you can access up to 25% of your RSA balance if you lose your job and are unable to find work for four months. Otherwise, the funds are locked until retirement age. " +
          NOT_ADVICE,
      },
    ],
  },
];

export const toolsBySlug = new Map(tools.map((tool) => [tool.slug, tool]));

export function getTool(slug: string): Tool | undefined {
  return toolsBySlug.get(slug);
}

export function toolsInCategory(id: CategoryId): Tool[] {
  return tools.filter((tool) => tool.category === id);
}

export function relatedTools(slug: string, limit = 3): Tool[] {
  const tool = getTool(slug);
  if (!tool) return tools.slice(0, limit);
  const sameCategory = tools.filter(
    (t) => t.slug !== slug && t.category === tool.category
  );
  const others = tools.filter(
    (t) => t.slug !== slug && t.category !== tool.category
  );
  return [...sameCategory, ...others].slice(0, limit);
}

export function searchTools(query: string): Tool[] {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter((tool) =>
    [tool.title, tool.blurb, ...tool.keywords]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

export const registry = {
  tools,
  categories,
  getTool,
  relatedTools,
  searchTools,
  toolsBySlug,
  toolsInCategory,
};
