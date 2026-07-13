## Goal
Make LabLink actually discoverable in Google Search and AI answer engines (ChatGPT, Perplexity, Google AI Overviews) for Egypt-dental-lab queries. Right now the site ships correct technical SEO but has three real blockers to being *cited*: (1) Google hasn't been told to crawl it yet, (2) there's almost no indexable textual content on public routes for engines to match queries against, and (3) there's no local/GEO signal telling Google this is an Egypt business.

## Why nothing shows up today
- Site was only verified in Google Search Console a few turns ago — Google hasn't crawled/indexed it yet. Indexing typically takes 3–14 days after first sitemap submission, and nothing has been submitted yet via the API.
- Public routes (`/`, `/labs`, `/about`, `/how-it-works`, `/plans`, `/contact`) have marketing copy but no **long-form, keyword-rich text** targeting real search queries ("dental lab Cairo", "zirconia crown Egypt", "معمل أسنان القاهرة", etc.).
- No `LocalBusiness` / geo schema. Google can't tell we're an Egypt-based service, so we don't surface in local packs or "near me" queries.
- No hreflang tags — Arabic version isn't advertised to Google, so Arabic searches never match.
- `/labs/:id` lab profile pages are excluded from the labs sitemap because the anon Supabase query returns 0 rows (RLS filtering) — every individual lab page is invisible to crawlers.
- No public content hub (blog, guides, glossary) — nothing for AI engines to cite.

## Plan

### 1. Submit sitemap + request indexing via GSC API (immediate)
- Use the `google_search_console` connector to:
  - `PUT /sitemaps/…/sitemap.xml` — formally submit the sitemap index.
  - `urlInspection/index:inspect` on each key public URL to see current index status.
  - Report back per-URL status (Indexed / Discovered / Crawled-not-indexed / Not found) so we know exactly what Google sees.

### 2. Fix `/labs/:id` invisibility (biggest indexing hole)
- Debug why `scripts/generate-sitemap.ts` returns 0 lab rows. Either:
  - The `labs` table needs an anon-readable RLS policy for `is_active = true` rows (public directory), **or**
  - The generator should call a `SECURITY DEFINER` RPC (`get_public_labs_for_sitemap`) that returns id + updated_at without exposing private fields.
- Once fixed, every active lab profile becomes a real indexable URL — this alone should 10× the indexable surface area.

### 3. Add GEO / LocalBusiness structured data
- Extend `StructuredData.tsx` with a `localBusinessSchema()` returning `@type: DentalLaboratory` (or `Organization` with `areaServed: EG` + `address`) including:
  - `addressCountry: EG`, `addressRegion: Cairo`, `addressLocality`
  - `geo: { latitude, longitude }` (Cairo coordinates as default)
  - `areaServed: [Cairo, Giza, Alexandria, …]`
  - `availableLanguage: [en, ar]`
- Inject on Home + Contact + About.
- Add per-lab `LocalBusiness` / `DentalLaboratory` schema on `/labs/:id` pulling that lab's city/address from DB.

### 4. hreflang + Arabic discoverability
- In `usePageTitle` (or a new `useHreflang` hook), inject `<link rel="alternate" hreflang="en" …>`, `hreflang="ar"`, and `hreflang="x-default"` on every public route.
- Ensure the Arabic language toggle produces a crawlable URL variant (e.g. `?lang=ar` or `/ar/…`) — pick one; I recommend `?lang=ar` since routing is already set up around the existing paths.

### 5. On-page content depth for real queries
For each public route, add a dedicated SEO content section (still styled, still on-brand — not a wall of text) targeting a keyword cluster:
- **Home** — "dental lab marketplace Egypt", "معمل أسنان مصر"
- **/labs** — "find dental lab Cairo/Giza/Alexandria", city filter chips as crawlable links
- **/how-it-works** — "how to send a dental case to a lab online"
- **/plans** — "dental lab software pricing Egypt"
- **/about** — brand + Egypt market context
- **/contact** — NAP block (Name/Address/Phone) matching LocalBusiness schema exactly

Each section: one H2, 150–300 words of genuine bilingual-friendly copy, internal links to sibling pages. No keyword stuffing.

### 6. AI-engine citation surface (`llms.txt` + FAQ expansion)
- `public/llms.txt` already exists — audit and expand it into a proper AI-crawler index (site summary, key URLs, canonical facts about the service, supported cities, pricing tiers). This is what Perplexity/ChatGPT actually read to cite you.
- Expand landing FAQ from 6 → 12 questions covering the highest-intent long-tail queries; FAQPage JSON-LD is already wired so new entries auto-flow into structured data.

### 7. Verify + monitor
- Re-run `urlInspection` after 48h and after 7d, report indexed count.
- Add a lightweight `scripts/seo-status.ts` that queries GSC for indexed/impressions/clicks per URL so future scans can track progress.

## Out of scope (call out, don't do)
- SSR/prerender migration (already discussed, rejected as too risky).
- Paid Google Ads / SEM.
- Backlink outreach (that's an ops task, not a code task).

## Technical notes
- Sitemap generator env fix: verify `.env` has `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` at generator run time; add a `console.log` of row count and HTTP status when the labs fetch runs so we can see in build logs why it returns 0.
- All new JSON-LD lives in `src/components/seo/StructuredData.tsx` as helper factories — no duplication with `index.html` (Organization/SoftwareApplication stay sitewide; LocalBusiness/DentalLaboratory become per-route).
- hreflang: use absolute URLs, self-referential included, `x-default` → English.
- Keep everything within the existing i18n system (`useLanguage`), no new translation infra.

## Deliverables order
1. GSC sitemap submission + inspection report *(no code, just API calls, gives us a baseline)*
2. Fix labs sitemap (RLS/RPC + generator)
3. LocalBusiness + hreflang injection
4. Content depth pass on 6 public routes
5. `llms.txt` rewrite + FAQ expansion
6. Follow-up inspection after 48h

Want me to start with **step 1 (GSC diagnostic — tells us exactly what Google currently sees, ~1 min, no code)** and then proceed through the rest, or prioritize a different order?
