

# Frontend Bundle Analysis Report

## 1. Top Bundle Size Contributors (estimated gzip)

| Dependency | Est. Size (gzip) | Used In | Critical Path? |
|---|---|---|---|
| **framer-motion** | ~45-60 KB | 15 files, App.tsx (PageTransition, AnimatePresence) | YES — loaded on every route |
| **recharts** | ~50-70 KB | 3 files (AdminAnalyticsTab, AdminCharts, chart.tsx) | No — admin only |
| **@supabase/supabase-js** | ~30-40 KB | Auth, queries | YES |
| **react-joyride** | ~25-35 KB | 1 file (DashboardTour.tsx) | No |
| **@dnd-kit (core+sortable+utilities)** | ~20-25 KB | 1 file (PreferredLabsList.tsx) | No |
| **date-fns** | ~10-15 KB | Multiple files | YES (tree-shakeable) |
| **lucide-react** | ~5-8 KB | Everywhere | YES (tree-shakeable) |
| **canvas-confetti** | ~8 KB | 3 files | No |
| **exifr** | ~15-20 KB | 1 file (imageMetadata.ts) | No |

## 2. Critical Issues Found

### A. Unused Dependencies (should be removed from package.json)
- **`embla-carousel-react`** — Only in `carousel.tsx` wrapper; `Carousel` component is never imported anywhere
- **`react-resizable-panels`** — Only in `resizable.tsx` wrapper; `Resizable` component is never imported anywhere
- **`input-otp`** — Only in `input-otp.tsx` wrapper; `InputOTP` component is never imported anywhere
- **`@playwright/test`** — Test framework in production `dependencies` instead of `devDependencies`
- **`cmdk`** — Only in `command.tsx` shadcn wrapper; need to verify if actually used

**Estimated savings: ~40-50 KB gzip** (these get bundled even if wrappers are never imported by app code, depending on Vite tree-shaking effectiveness)

### B. framer-motion in Critical Path
`framer-motion` (~50KB gzip) is eagerly loaded in `App.tsx` via `AnimatePresence` and `PageTransition`. It's also embedded in base UI primitives (`input.tsx`, `textarea.tsx`, `tooltip.tsx`, `popover.tsx`) meaning it cannot be tree-shaken out of the initial bundle at all.

### C. Home Page Eager-Loads 12 Landing Sections
`Home.tsx` imports 12 components synchronously. Below-the-fold sections (`ProofSection`, `FAQSection`, `VideoTutorialSection`, `DualView`) should be lazy.

## 3. Proposed Fixes

### Phase 1: Remove Dead Dependencies
- Delete `embla-carousel-react`, `react-resizable-panels`, `input-otp` from `package.json`
- Delete their unused wrapper files: `carousel.tsx`, `resizable.tsx`, `input-otp.tsx`
- Move `@playwright/test` to `devDependencies`

### Phase 2: Dynamic Import Heavy Libraries
- **recharts**: Already isolated to admin — ensure `AdminAnalyticsTab` and `AdminCharts` are lazy-loaded (they are, via `Admin` page lazy import)
- **react-joyride**: Dynamic import inside `DashboardTour.tsx` — `const Joyride = lazy(() => import("react-joyride"))`
- **canvas-confetti**: Convert to dynamic `import()` at call sites (only triggered on user action)
- **exifr**: Already behind `imageMetadata.ts` which is only called from `OrderForm` — already code-split via lazy `NewOrder` page
- **@dnd-kit**: Only used in `PreferredLabsList` — already code-split via lazy `PreferredLabs` page

### Phase 3: Lazy-Load Below-Fold Home Sections
Split `Home.tsx` — lazy-load `VideoTutorialSection`, `DualView`, `ProofSection`, `FAQSection` with intersection observer or `Suspense`.

### Phase 4: Evaluate framer-motion Footprint
framer-motion is deeply embedded (15 files including base UI primitives). Removing it is high-risk/high-effort. However:
- The `AnimatePresence` + `PageTransition` wrapper on every route adds overhead. Consider removing page transitions or making them CSS-only for a ~50KB win on initial load.
- At minimum, remove `motion` from `input.tsx`, `textarea.tsx`, `popover.tsx`, `tooltip.tsx` — these are base primitives that shouldn't carry animation weight.

## 4. Summary of Savings

| Fix | Est. Savings (gzip) | Effort |
|---|---|---|
| Remove dead deps + wrappers | ~40-50 KB | Low |
| Move `@playwright/test` to devDeps | ~0 (build-time only) | Trivial |
| Dynamic import canvas-confetti | ~8 KB off initial | Low |
| Dynamic import react-joyride | ~30 KB off initial | Low |
| Remove motion from base UI primitives | ~0 (still used elsewhere) | Medium |
| Remove page transitions entirely | ~50 KB off initial | Medium-High |
| Lazy home below-fold sections | ~20-30 KB off initial | Low |
| **Total potential** | **~150-170 KB** | |

## Implementation Order
1. Remove 4 dead dependencies + their wrapper files
2. Dynamic-import `canvas-confetti` and `react-joyride`
3. Lazy-load below-fold Home sections
4. Strip `motion` from base UI primitives (`input`, `textarea`, `tooltip`, `popover`)

