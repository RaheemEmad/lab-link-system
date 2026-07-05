// Generates a sitemap index and sub-sitemaps into public/.
// Runs before dev and build via predev/prebuild.
//
// Layout:
//   public/sitemap.xml        → <sitemapindex> pointing to sub-sitemaps
//   public/sitemap-pages.xml  → static public marketing/legal routes
//   public/sitemap-labs.xml   → one <url> per active public lab profile (/labs/:id)
//
// The labs sub-sitemap is fetched from Supabase using the anon key. If the
// fetch fails (offline, network, missing env) we still write an empty but
// valid sitemap-labs.xml so the index stays consistent and the build never
// breaks over sitemap generation.

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Lightweight .env loader so we don't take on a dotenv dep.
function loadDotenv() {
  const p = resolve(".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, rawV] = m;
    if (process.env[k]) continue;
    const v = rawV.replace(/^['"]|['"]$/g, "");
    process.env[k] = v;
  }
}
loadDotenv();

const BASE_URL = "https://lablink-smartlab.lovable.app";
const NOW = new Date().toISOString().slice(0, 10);

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticPages: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/auth", changefreq: "monthly", priority: "0.8" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
  { path: "/labs", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/plans", changefreq: "monthly", priority: "0.7" },
  { path: "/install", changefreq: "yearly", priority: "0.4" },
  { path: "/reset-password", changefreq: "yearly", priority: "0.2" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

function xmlEscape(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderUrlset(entries: Entry[]): string {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${xmlEscape(BASE_URL + e.path)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

function renderIndex(files: { file: string; lastmod: string }[]): string {
  const items = files
    .map(
      (f) =>
        `  <sitemap>\n    <loc>${BASE_URL}/${f.file}</loc>\n    <lastmod>${f.lastmod}</lastmod>\n  </sitemap>`,
    )
    .join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    items,
    `</sitemapindex>`,
    ``,
  ].join("\n");
}

async function fetchLabs(): Promise<Entry[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("[sitemap] Supabase env missing — labs sub-sitemap will be empty");
    return [];
  }
  try {
    const res = await fetch(
      `${url}/rest/v1/labs?select=id,updated_at&is_active=eq.true`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      console.warn(`[sitemap] labs fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const rows = (await res.json()) as { id: string; updated_at?: string }[];
    return rows.map((r) => ({
      path: `/labs/${r.id}`,
      lastmod: (r.updated_at || NOW).slice(0, 10),
      changefreq: "weekly" as const,
      priority: "0.7",
    }));
  } catch (err) {
    console.warn(`[sitemap] labs fetch threw:`, (err as Error).message);
    return [];
  }
}

async function main() {
  const labs = await fetchLabs();

  writeFileSync(resolve("public/sitemap-pages.xml"), renderUrlset(staticPages));
  writeFileSync(resolve("public/sitemap-labs.xml"), renderUrlset(labs));
  writeFileSync(
    resolve("public/sitemap.xml"),
    renderIndex([
      { file: "sitemap-pages.xml", lastmod: NOW },
      { file: "sitemap-labs.xml", lastmod: NOW },
    ]),
  );

  console.log(
    `[sitemap] wrote index + ${staticPages.length} pages + ${labs.length} labs`,
  );
}

main().catch((e) => {
  console.error("[sitemap] failed:", e);
  process.exit(1);
});
