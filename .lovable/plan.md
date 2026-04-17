
The user re-pasted the full original spec. The two bug fixes (race condition + marketplace cards) and the RLS migration were just shipped in the previous turn. Remaining work: invite flow RLS + auto-role assignment, Lab Profile gallery + reviews, Payment confirmation flow, AI recommendation engine. I should also harden the race-condition fix across more entry points (sidebar, dashboards) since the user explicitly listed them.

Let me check what already exists for invites, reviews, and gallery before planning.

Skipping deep tool calls — I have enough context from the file index and prior summaries:
- `LabInvitationManager.tsx` exists (lab → doctor invites) but no team-member invite flow.
- No `lab_gallery`, no `order_reviews` table referenced.
- No payment_confirmed status, no payment confirmation modal.
- No recommendation engine.

Plan below covers the remaining 4 items in priority order. Two bug fixes already done get a verification pass.

---

## Plan: Complete Remaining Spec (Invites RLS, Lab Profile, Payments, AI Recs)

### Phase 0 — Verify & Harden Already-Shipped Fixes (quick pass)
- Audit `AdminSidebar`, `Dashboard`, `OrderDashboard`, `OrdersMarketplace` to ensure they ALL gate on `roleConfirmed` (not just `useOrdersQuery`). Add skeletons where missing.
- Add `isRoleLoading` alias export from `useUserRole` for clarity.

### Phase 1 — Team-Member Invite Flow + RLS Fix
**DB migration:**
- New table `team_invitations` (id, organization_id, organization_type [`lab`|`clinic`], invited_email, invited_role, invite_token, status, invited_by, expires_at).
- RLS: lab_admin/clinic_admin can `INSERT`/`SELECT` only where `organization_id` matches their own (resolved via `user_roles.lab_id` or profile clinic).
- Trigger `on_auth_user_created`: when a new auth user signs up with an email matching a pending invite, auto-insert into `user_roles` with the invited role + lab_id, mark invite `accepted`.
- Edge function `invite-team-member` (uses **service role key**) — sends invite via `auth.admin.inviteUserByEmail` with metadata `{ invite_token }`.

**Frontend:**
- New `TeamInvitationsTab` in `LabAdmin` (and clinic admin equivalent in `Profile`).
- Form: email + role; list of pending/accepted invites.

### Phase 2 — Lab Profile Gallery + Reviews
**DB migration:**
- `lab_gallery` (id, lab_id, image_url, case_type, material, caption, sort_order, created_at).
- `lab_reviews` (id, order_id UNIQUE, lab_id, doctor_id, overall_rating, quality_rating, communication_rating, on_time_rating, comment, created_at). Labs cannot UPDATE/DELETE.
- Storage bucket `lab-gallery` (public read, lab-staff write scoped to their lab).
- View/RPC `lab_aggregate_stats(lab_id)` → avg ratings, total reviews, on-time %.

**Frontend:**
- `LabGalleryManager.tsx` (upload, grid management) → new "Gallery" tab in `LabAdmin`.
- `LabGallery.tsx` (masonry grid + lightbox) on `LabProfile.tsx`.
- `LabReviewsList.tsx` (replaces/extends `LabPastWork.tsx`) — only completed orders w/ submitted reviews.
- `ReviewPromptDialog.tsx` — auto-shown to doctor on `OrderTracking` when status = Delivered & no review yet. 5 fields, 1–5 stars.
- Aggregate header card on `LabProfile` (avg stars, total, on-time %).

### Phase 3 — Payment Confirmation Flow
**DB migration:**
- Add `payment_confirmations` table (order_id, doctor_id, lab_id, amount, method [`bank`|`card`|`cash`], reference_number, paid_at, note, receipt_url, created_at).
- Add `awaiting_payment` and `payment_confirmed` to allowed order statuses (or use existing payments table — verify first).
- Trigger: on insert → set order status to `payment_confirmed`, fire notification to lab.

**Frontend:**
- `ConfirmPaymentDialog.tsx` — auto-fills order/lab/doctor/amount; user inputs method + reference + optional note.
- "Confirm Payment" button on order detail page (visible to doctor when status = `awaiting_payment`).
- `PaymentReceiptCard.tsx` — formal slip-style component rendered inline in `OrderChatWindow` (not a chat bubble).
- Edge function `generate-payment-receipt` → produces PDF, uploads to storage, returns URL.

### Phase 4 — AI Recommendation Engine (Gold/Platinum)
**DB migration:**
- `recommendation_cache` (user_id, type [`labs_for_doctor`|`cases_for_lab`], payload jsonb, factors jsonb, computed_at). 30-min TTL via timestamp.

**Edge function `compute-recommendations`:**
- Input: user_id, type. Output: top N with score + explainability factors.
- For doctors: score labs on specialization match, avg rating, on-time %, past success w/ this clinic, response time, proximity.
- For labs: score cases on specialization match, doctor verification, deadline feasibility (current workload), doctor reliability.
- Cache 30 min.

**Frontend:**
- `useRecommendations` hook — gated by subscription tier (read from existing subscriptions table).
- `RecommendedLabsSection.tsx` on `Dashboard` + `NewOrder`.
- `RecommendedCasesSection.tsx` on lab `Dashboard` + `OrdersMarketplace`.
- `RecommendationCard.tsx` — distinct styling, "Recommended for you" label, match score badge, primary reason chip.
- Locked/blurred state for Free/Silver with upgrade CTA → `/subscription-plans`.

### Technical Notes
- All new tables: RLS-enabled, scoped to organization/user.
- All mutations use React Query with optimistic updates where safe.
- All new components: loading + empty + error states.
- Mobile-first, 44px touch targets, follows existing design tokens.
- New memories will be saved for: invite flow, lab gallery/reviews, payment confirmation, recommendation engine.

### Delivery order
1. Phase 0 (harden) — small
2. Phase 1 (invites) — medium
3. Phase 2 (lab profile) — large, highest user-visible value
4. Phase 3 (payments) — medium
5. Phase 4 (AI recs) — large

Given the scope, I'll deliver Phase 0 + Phase 1 + Phase 2 in this round, then Phase 3 + Phase 4 next round to keep changes reviewable.
