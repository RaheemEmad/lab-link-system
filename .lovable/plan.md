

# Arabic Language Support + Dark Mode Toggle + UI/UX Polish

## Current State
- Dark mode toggle exists (`ThemeToggle` in nav + Settings page) and works
- No i18n/translation system exists — all strings are hardcoded in English
- RTL layout support is absent (no `dir="rtl"` handling)
- Responsive utilities exist (touch targets, density system, mobile nav) but need audit passes

## Plan

### 1. Add i18n System with Arabic Support

**Create translation infrastructure:**
- `src/lib/i18n/types.ts` — TypeScript types for translation keys
- `src/lib/i18n/en.ts` — English translations dictionary
- `src/lib/i18n/ar.ts` — Arabic translations dictionary  
- `src/lib/i18n/LanguageContext.tsx` — React context + provider with `useLanguage()` hook
  - Stores language in `localStorage`
  - Sets `document.documentElement.dir` to `"rtl"` or `"ltr"`
  - Sets `document.documentElement.lang` to `"ar"` or `"en"`

**Translation scope (phase 1 — navigation + settings + landing):**
- LandingNav labels (Home, Dashboard, How It Works, etc.)
- LandingHero (headline, subheadline, CTA buttons)
- LandingFooter (Privacy, Terms, Contact)
- Settings page (all tab labels and content)
- MobileBottomNav labels
- Auth page (Sign In, Sign Up, form labels)
- Common UI: Empty states, offline banner, 404 page

### 2. Language Switcher Component
- `src/components/ui/language-toggle.tsx` — Globe icon button, toggles EN/AR
- Add to LandingNav (next to ThemeToggle)
- Add to Settings page as a new "Language" section in Appearance tab

### 3. RTL CSS Support
- Add RTL-aware utilities in `index.css`:
  - `[dir="rtl"]` overrides for margins, paddings, transforms that use directional values
  - Flip nav animations, slide directions
  - Use logical CSS properties where possible (`margin-inline-start` etc.)
- Tailwind already supports `rtl:` prefix — use it for directional spacing

### 4. Wrap App with LanguageProvider
- In `App.tsx`, wrap inside `<LanguageProvider>` (inside ThemeProvider)

### 5. UI/UX & Responsiveness Polish Pass
- Ensure all interactive elements have `min-h-[44px]` touch targets on mobile
- Add `transition-all duration-200` to all cards, buttons, and nav items consistently
- Ensure `PageTransition` works smoothly (already does via framer-motion)
- Add `rtl:` Tailwind variants to directional layouts (flex-row, translate-x, margins)

## Files to Create
| File | Purpose |
|------|---------|
| `src/lib/i18n/types.ts` | Translation key types |
| `src/lib/i18n/en.ts` | English dictionary |
| `src/lib/i18n/ar.ts` | Arabic dictionary |
| `src/lib/i18n/LanguageContext.tsx` | Context provider + hook |
| `src/components/ui/language-toggle.tsx` | Globe icon language switcher |

## Files to Modify
| File | Change |
|------|--------|
| `src/App.tsx` | Wrap with `LanguageProvider` |
| `src/index.css` | Add RTL overrides |
| `src/components/landing/LandingNav.tsx` | Add language toggle, use `t()` for labels |
| `src/components/landing/LandingHero.tsx` | Use `t()` for headline/CTA text |
| `src/components/landing/LandingFooter.tsx` | Use `t()` for link labels |
| `src/components/layout/MobileBottomNav.tsx` | Use `t()` for nav labels |
| `src/pages/Settings.tsx` | Add language selector in Appearance tab |
| `src/pages/NotFound.tsx` | Use `t()` for 404 text |
| `src/components/ui/offline-banner.tsx` | Use `t()` |
| `src/pages/Auth.tsx` | Use `t()` for form labels |

## Translation Key Structure (sample)
```typescript
{
  nav: { home, dashboard, howItWorks, labs, marketplace, settings, ... },
  hero: { headline, subheadline, ctaPrimary, ctaSecondary, ... },
  auth: { signIn, signUp, email, password, forgotPassword, ... },
  settings: { appearance, notifications, privacy, shortcuts, language, ... },
  common: { loading, error, retry, goBack, noResults, ... },
  footer: { privacy, terms, contact, copyright },
}
```

