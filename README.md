# Smart Money Coach

Personalized investing and mortgage decision support — a Next.js demo app with rule-based recommendations.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Flow

1. Fill out the financial profile form on the homepage.
2. Click **Get Recommendation** to navigate to `/recommendation`.
3. View summary, rationale, priority order, and three next actions.

Recommendations are generated locally from simple heuristics (debt load, mortgage rate, retirement rate, savings buffer, risk tolerance).
