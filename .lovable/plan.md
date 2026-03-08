

# Plan: Smooth Dropdown Auto-Close on Chat Open

## Problem
When tapping "Open Chat" from the order's dropdown menu, the dropdown doesn't close smoothly before the chat window appears — creating a jarring transition.

## Root Cause
The `DropdownMenuItem` `onClick` fires `handleOpenChat` synchronously, which immediately opens the chat dialog. The Radix dropdown's close animation hasn't completed yet, causing visual overlap.

## Solution

**File**: `src/components/OrderDashboard.tsx`

1. Create a `handleOpenChatSmooth` wrapper that:
   - Uses `requestAnimationFrame` or a brief `setTimeout(0)` to let the dropdown's close animation complete before opening the chat
   - This ensures the menu dismisses visually before the chat window mounts

2. Replace all `handleOpenChat(order)` calls inside `DropdownMenuItem` (lines 641, 894) with `handleOpenChatSmooth(order)`

3. Same treatment for `QuickViewOrder` — when "Open Chat" is tapped from the quick view sheet, close the sheet first, then open the chat after a short delay

**File**: `src/components/dashboard/OrderQuickView.tsx`

4. Update `onOpenChat` handler to first call `onClose()` (close the sheet), then fire `onOpenChat` with a small delay so the sheet slides away before the chat appears

This is a minimal change — two small wrapper functions, no structural changes.

