// Runs after build (postbuild) and before dev (predev). Verifies:
//  1. public/robots.txt exists and references the canonical sitemap URL
//  2. public/sitemap.xml exists, parses, and every <loc> uses the canonical base
//  3. all private routes are Disallowed in robots.txt
// Fails the build (exit 1) if any check fails.

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://lablink-smartlab.lovable.app";
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;

// Routes that must be Disallowed for crawlers (authenticated / sensitive).
const PRIVATE_ROUTES = [
  "/admin",
  "/admin/login",
  "/settings",
  "/wallet",
  "/dashboard",
  "/profile",
  "/profile-completion",
  "/onboarding",
  "/new-order",
  "/edit-order",
  "/order-tracking",
  "/orders-marketplace",
  "/lab-workflow",
  "/lab-order",
  "/lab-requests",
  "/lab-admin",
  "/lab-calendar",
  "/logistics",
  "/messages",
  "/chat-history",
  "/notifications",
  "/inbox",
  "/drafts",
  "/feedback-room",
  "/patient-cases",
  "/templates",
  "/analytics",
  "/appointment-scheduling",
  "/track-orders",
  "/design-approval",
  "/preferred-labs",
  "/achievements",
  "/doctor-achievements",
  "/lab-achievements",
  "/support",
  "/invoice",
];

const errors: string[] = [];
const robotsPath = resolve("public/robots.txt");
const sitemapPath = resolve("public/sitemap.xml");

if (!existsSync(robotsPath)) {
  errors.push("public/robots.txt is missing");
} else {
  const robots = readFileSync(robotsPath, "utf8");
  if (!robots.includes(`Sitemap: ${SITEMAP_URL}`)) {
    errors.push(`robots.txt missing or wrong Sitemap line. Expected: "Sitemap: ${SITEMAP_URL}"`);
  }
  // Find the wildcard block and check its Disallow directives.
  const wildcardIdx = robots.indexOf("User-agent: *");
  const wildcardBlock = wildcardIdx >= 0 ? robots.slice(wildcardIdx) : "";
  const disallowed = new Set(
    [...wildcardBlock.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]),
  );
  for (const route of PRIVATE_ROUTES) {
    if (!disallowed.has(route)) {
      errors.push(`robots.txt: missing "Disallow: ${route}" under User-agent: *`);
    }
  }
}

// Verify sitemap index + sub-sitemaps.
const indexPath = resolve("public/sitemap.xml");
if (!existsSync(indexPath)) {
  errors.push("public/sitemap.xml is missing");
} else {
  const indexXml = readFileSync(indexPath, "utf8");
  if (!indexXml.includes("<sitemapindex")) {
    errors.push("public/sitemap.xml must be a <sitemapindex> (run generate:sitemap)");
  }
  const subLocs = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (subLocs.length === 0) errors.push("sitemap.xml has zero <sitemap> entries");
  for (const loc of subLocs) {
    if (!loc.startsWith(BASE_URL)) errors.push(`sitemap index entry uses wrong base URL: ${loc}`);
    const rel = loc.replace(BASE_URL + "/", "");
    const subPath = resolve("public", rel);
    if (!existsSync(subPath)) {
      errors.push(`sitemap index references missing file: public/${rel}`);
      continue;
    }
    const subXml = readFileSync(subPath, "utf8");
    const urlLocs = [...subXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    for (const u of urlLocs) {
      if (!u.startsWith(BASE_URL)) errors.push(`${rel} entry uses wrong base URL: ${u}`);
      const p = u.replace(BASE_URL, "") || "/";
      if (PRIVATE_ROUTES.some((pr) => p === pr || p.startsWith(pr + "/"))) {
        errors.push(`${rel} lists private route: ${p}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("❌ SEO file check failed:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`✅ SEO files OK (sitemap → ${SITEMAP_URL}, ${PRIVATE_ROUTES.length} private routes blocked)`);
