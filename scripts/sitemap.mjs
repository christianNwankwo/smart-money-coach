/**
 * Write `out/sitemap.xml` and `out/sw.js` from the registry.
 *
 * A static export has no server to generate a sitemap on the fly — a sitemap
 * removes the dependency on crawlers following links from the home page.
 *
 * The service worker precache manifest is also written here so it is always in
 * sync with the actual routes the build produced.
 *
 * Run after `npm run build`, chainable via `postbuild`.
 */

import { writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadTs } from "../tests/tsload.mjs";

const SITE = process.env.SITE_URL ?? "https://smartmoneycoach.com";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = `${ROOT}/out`;

const MARKET = process.env.NEXT_PUBLIC_MARKET ?? "us";
const reg = loadTs(new URL(`../src/markets/${MARKET}/registry.ts`, import.meta.url));
const config = loadTs(new URL(`../src/markets/${MARKET}.ts`, import.meta.url));
const marketConfig = config[`${MARKET}Market`];

const urls = [
  { loc: `${SITE}/`, changefreq: "weekly", priority: "1.0" },
  // Only listed where the market actually has a recommendation engine — the
  // page still exists as a file, but it says "not available here" and is
  // marked noindex, so advertising it in the sitemap would be a bad signal.
  ...(marketConfig.hasQuickCheck
    ? [{ loc: `${SITE}/recommendation/`, changefreq: "monthly", priority: "0.9" }]
    : []),
  ...reg.tools.map((tool) => ({
    loc: `${SITE}/tools/${tool.slug}/`,
    changefreq: "monthly",
    priority: "0.8",
  })),
];

// --- sitemap.xml ---
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(
    (u) =>
      `  <url>\n` +
      `    <loc>${u.loc}</loc>\n` +
      `    <changefreq>${u.changefreq}</changefreq>\n` +
      `    <priority>${u.priority}</priority>\n` +
      `  </url>`
  ),
  "</urlset>",
  "",
].join("\n");

writeFileSync(`${OUT}/sitemap.xml`, xml, "utf-8");

// --- sw.js with accurate precache ---
// Walk the built output so the precache list is never stale: every .html file
// becomes an entry, every JS/CSS chunk inside _next/ is also cached at runtime.
const precachePaths = ["/"];
function walk(dir, base = "") {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "404.html") continue;
    const full = `${dir}/${e.name}`;
    const rel = `${base}/${e.name}`;
    if (e.isDirectory()) {
      walk(full, rel);
    } else if (/\.html$/.test(e.name) && base) {
      precachePaths.push(rel.replace(/\/index\.html$/, "/"));
    }
  }
}
if (existsSync(OUT)) walk(OUT);

const sw = `
const CACHE = "smc-v1";

const PRECACHE = ${JSON.stringify(precachePaths, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetched = fetch(event.request).then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        });
        return cached || fetched;
      })
    )
  );
});
`;

writeFileSync(`${OUT}/sw.js`, sw, "utf-8");

console.log(
  `sitemap: wrote ${urls.length} URLs to sitemap.xml, ` +
    `${precachePaths.length} entries to sw.js (site: ${SITE})`
);
