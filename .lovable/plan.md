

# Plan: Relocate Help Button to Avoid Overlap

## Problem
Three floating elements compete for `bottom-6 right-6`: Help button, Scroll-to-Top button, and the Chat window. They visually overlap.

## Solution: Convert Help Button to a Vertical FAB Stack

Instead of a standalone floating button, create a **stacked FAB (Floating Action Button) approach** where the Help button sits above the Scroll-to-Top button, and both shift up when the chat window is open.

### Changes

**File: `src/components/layout/HelpButton.tsx`**
- Move position from `bottom-6 right-6` to `bottom-20 right-6` — sits above where ScrollToTop appears
- Make it smaller and subtler: use a `h-10 w-10` circle with a softer style so it doesn't dominate
- Add a smooth slide-up transition when ScrollToTop becomes visible (pass visibility via CSS or a shared context)

**File: `src/components/ui/scroll-to-top.tsx`**
- Keep at `bottom-6 right-6` (unchanged — this is the primary FAB position)

**Result**: Help button always sits one row above (bottom-20), ScrollToTop occupies bottom-6. No overlap. When chat window opens (bottom-right), both FABs are smaller and less intrusive than the chat card, so they naturally layer below it via z-index (chat is z-50, help is z-40).

### Simpler Alternative Considered
Move Help to `bottom-6 left-6` — but this conflicts with potential mobile nav elements and feels inconsistent.

### Files
| File | Change |
|------|--------|
| `src/components/layout/HelpButton.tsx` | Move to `bottom-20 right-6`, reduce z-index to `z-40` |

One file, one line change.

