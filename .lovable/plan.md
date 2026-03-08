

# Plan: Fix Chat Responsiveness + Add File Uploads to Edit Order with Feedback Room Sync

## 1. Fix Chat Window Responsiveness

**File**: `src/components/chat/OrderChatWindow.tsx`

**Current issue** (line 446): The chat uses `fixed` positioning with `w-full sm:w-96 h-[100vh] sm:h-[600px]`. On tablets and medium screens this causes overlap/sizing problems. When multiple chat windows could open, there's no stacking logic.

**Changes**:
- Add responsive breakpoints: `md:w-[420px] lg:w-[450px]`
- Cap height with `max-h-[100dvh] sm:max-h-[80vh]` using `dvh` for mobile browser chrome
- Reduce textarea min-height on mobile
- Make the input area more compact on small screens
- Use `sm:bottom-4 sm:right-4` (already exists) but add safe-area insets for mobile

## 2. Add File Upload Section to Edit Order

**File**: `src/pages/EditOrder.tsx`

**Changes**:
- Import and add `FileUploadSection` component (the same one used in `OrderForm`) between the "Restoration Details" and "Delivery & Budget" sections
- Pass `orderId` prop so it loads existing attachments and uploads new ones to `order-attachments` bucket
- Add a new section header "Attachments & Files"

## 3. Sync Edit Order Uploads to Feedback Room

**File**: `src/pages/EditOrder.tsx` (in the `onSubmit` handler)

**Changes**: After a successful file upload via `FileUploadSection`, also insert a record into `feedback_room_attachments` for each new file so it appears in the Feedback Room. This mirrors the same pattern already used elsewhere (per memory: "Photos uploaded during order creation are automatically mirrored to the Feedback Room").

Implementation:
- After the order update succeeds, query `order_attachments` for the order to find any newly uploaded files (those not already in `feedback_room_attachments`)
- For each new attachment, insert into `feedback_room_attachments` with matching metadata (file_url, file_name, file_type, file_size, category mapped from attachment_category)
- Log activity via `log_feedback_activity` RPC

## Files Summary

| Action | File |
|--------|------|
| Modify | `src/components/chat/OrderChatWindow.tsx` — responsive sizing fixes |
| Modify | `src/pages/EditOrder.tsx` — add FileUploadSection + feedback room sync |

