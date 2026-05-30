# Plan: Complete Remaining Marketplace Features (Stability, Access Control, Trust Layer, Payments, Recommendations)

The race-condition fix, marketplace card fix, and RLS migration have already been shipped.

Remaining work focuses on:

* Hardening role resolution
* Team-member invitation workflow
* Lab portfolio & reputation system
* Payment verification workflow
* Capacity-aware recommendation engine
* Subscription-driven marketplace intelligence

---

# Phase 0 — Harden Already-Shipped Role Resolution Fixes

## Goal

Ensure the race-condition fix is enforced consistently across the application rather than only in order-related flows.

---

## Frontend

### Create Centralized Role Guard

Replace scattered loading and role checks with:

```tsx
<RoleGuard>
  {children}
</RoleGuard>
```

Responsibilities:

* Wait for role resolution
* Wait for profile loading
* Wait for organization loading
* Prevent premature rendering
* Handle loading states
* Handle unauthorized states

---

### Audit Existing Entry Points

Verify and update:

* AdminSidebar
* Dashboard
* OrderDashboard
* OrdersMarketplace
* Notifications
* OrderDetails
* Protected Routes

Ensure all rely on:

```ts
roleConfirmed
```

instead of local assumptions.

---

### Hook Improvements

Expose:

```ts
isRoleLoading
```

from:

```ts
useUserRole()
```

for clarity.

---

## Deliverable

* Zero role-related race conditions
* Consistent authorization behavior
* Single access-control pattern across the application

---

# Phase 1 — Team Invitations + Auto Role Assignment

## Goal

Allow clinics and labs to onboard staff without manual intervention.

---

## Database Migration

### New Table

```sql
team_invitations
```

Fields:

```sql
id

organization_id
organization_type

invited_email
invited_role

invite_token

status

expires_at

created_by
created_at
```

---

### Constraints

Prevent duplicate invitations:

```sql
UNIQUE(invited_email, organization_id)
```

---

### RLS Policies

Lab Admins and Clinic Admins can:

* Create invitations
* View invitations
* Cancel invitations

Only for organizations they manage.

---

### Signup Trigger

#### on_auth_user_created

Flow:

```text
User Signs Up
        ↓
Check Pending Invitation
        ↓
Assign Role
        ↓
Attach Organization
        ↓
Mark Invitation Accepted
```

Must be idempotent:

```sql
ON CONFLICT DO NOTHING
```

to prevent duplicate memberships.

---

### Edge Function

#### invite-team-member

Uses service role.

Responsibilities:

* Generate invite token
* Send invitation email
* Store invitation metadata

Metadata:

```json
{
  "invite_token": "..."
}
```

---

## Frontend

### New Component

```tsx
TeamInvitationsTab.tsx
```

Available within:

* Lab Admin
* Clinic Admin

---

### Features

Invite User:

```text
Email
Role
Send Invitation
```

Manage Invitations:

```text
Pending
Accepted
Expired
Cancelled
```

Manage Team:

```text
Current Team Members
```

---

## Deliverable

Complete organization onboarding flow without manual role assignment.

---

# Phase 2 — Lab Profile Gallery & Reviews (Trust Layer)

## Goal

Increase marketplace trust through portfolio visibility, verified reviews, and measurable reputation signals.

---

# 2A — Lab Gallery

## Database Migration

### New Table

```sql
lab_gallery
```

Fields:

```sql
id

lab_id

image_url

case_type
material

caption

sort_order

is_approved
approved_at

created_at
```

---

## Storage

### New Bucket

```text
lab-gallery
```

Permissions:

```text
Lab Staff → Upload
Public → Read
```

---

## Frontend

### Admin Management

```tsx
LabGalleryManager.tsx
```

Capabilities:

* Upload images
* Reorder images
* Delete images
* Edit captions
* Categorize cases

---

### Public Profile

```tsx
LabGallery.tsx
```

Integrated into:

```tsx
LabProfile.tsx
```

Features:

* Responsive grid
* Lightbox
* Lazy loading
* Mobile-first layout

---

# 2B — Reviews & Ratings

## Database Migration

### New Table

```sql
lab_reviews
```

Fields:

```sql
id

order_id UNIQUE

lab_id
doctor_id

overall_rating
quality_rating
communication_rating
on_time_rating

comment

created_at
```

---

## Review Eligibility

Only allow reviews when:

```text
Doctor owns order
AND
Order Status = Delivered
```

Restrictions:

* One review per order
* Labs cannot edit reviews
* Labs cannot delete reviews
* Reviews are immutable after submission

---

## Aggregate Metrics

### RPC

```sql
lab_aggregate_stats(lab_id)
```

Returns:

```text
Average Rating
Total Reviews
On-Time %
Repeat Customer %
```

---

## Frontend

### Review Prompt

```tsx
ReviewPromptDialog.tsx
```

Auto-display when:

```text
Delivered
AND
No Existing Review
```

---

### Reviews Display

```tsx
LabReviewsList.tsx
```

Displays:

* Rating breakdown
* Review count
* Recent reviews
* Verified Order badge

---

### Profile Header Metrics

Show:

```text
⭐ Average Rating
📝 Total Reviews
⏱ On-Time %
🔁 Repeat Customer %
```

---

## Deliverable

Complete reputation and social-proof system.

---

# Phase 3 — Payment Submission & Verification Workflow

## Goal

Create a complete payment lifecycle with verification, auditing, and dispute handling.

---

## Status Flow

Replace direct confirmation flow with:

```text
awaiting_payment
        ↓
payment_submitted
        ↓
payment_confirmed
```

Alternative path:

```text
payment_submitted
        ↓
payment_rejected
```

---

## Database Migration

### New Table

```sql
payment_confirmations
```

Fields:

```sql
id

order_id

doctor_id
lab_id

amount

method

reference_number

receipt_url

notes

status

created_at
```

---

## Doctor Experience

### ConfirmPaymentDialog.tsx

Auto-fill:

* Order
* Lab
* Amount

Inputs:

* Payment Method
* Reference Number
* Optional Note
* Receipt Upload

---

## Lab Experience

### Payment Review Panel

Actions:

```text
Approve
Reject
```

Rejection requires reason.

---

## Payment Receipt

### Component

```tsx
PaymentReceiptCard.tsx
```

Display:

* Amount
* Method
* Date
* Reference Number
* Receipt Attachment

Rendered as a payment record rather than a chat message.

---

## Notifications

Generate notifications for:

```text
Payment Submitted
Payment Approved
Payment Rejected
```

---

## Deliverable

Fully auditable payment workflow.

---

# Phase 4 — Capacity Management

## Goal

Prevent overloaded labs from receiving excessive recommendations.

---

## Database Additions

Track:

```sql
max_active_cases
```

and:

```sql
current_active_cases
```

or calculate dynamically from active orders.

---

## Metrics

Track:

* Active Orders
* Capacity Utilization
* Acceptance Rate
* Turnaround Time

---

## Deliverable

Workload-aware marketplace matching.

---

# Phase 5 — Recommendation Engine (V1)

## Goal

Launch explainable recommendations before introducing AI complexity.

---

## Recommendation Cache

### New Table

```sql
recommendation_cache
```

Fields:

```sql
user_id

type

payload

factors

computed_at
```

TTL:

```text
30 Minutes
```

---

## Recommendation Service

### compute-recommendations

Inputs:

```text
user_id
recommendation_type
```

Outputs:

```text
score
ranking factors
recommendation explanation
```

---

## Doctor Recommendation Formula

```text
40% Specialization Match
25% Rating
15% On-Time Delivery
10% Response Time
10% Available Capacity
```

---

## Lab Recommendation Formula

```text
40% Case Match
25% Doctor Reliability
15% Deadline Feasibility
10% Historical Success
10% Capacity Fit
```

---

## Frontend

### Hook

```ts
useRecommendations()
```

Subscription-gated.

Available for:

```text
Gold
Platinum
```

---

### Components

```tsx
RecommendedLabsSection.tsx
```

Locations:

* Dashboard
* New Order

---

```tsx
RecommendedCasesSection.tsx
```

Locations:

* Lab Dashboard
* Orders Marketplace

---

```tsx
RecommendationCard.tsx
```

---

## Explainability Requirement

Every recommendation must explain itself.

Example:

```text
93% Match

Why?

✓ Implant Specialist
✓ 4.9 Average Rating
✓ 97% On-Time Delivery
✓ Available Capacity
```

Avoid opaque ranking systems.

---

## Free / Silver Experience

Blur recommendation results.

Display:

```text
Unlock Smart Recommendations
```

CTA:

```text
/subscribe
```

---

## Deliverable

Capacity-aware recommendation engine with transparent ranking logic.

---

# Future Phase — AI Recommendation Engine (V2)

Only after sufficient marketplace data exists.

Potential additions:

* Personalized ranking
* Behavioral recommendations
* Predictive delivery estimates
* Demand forecasting
* Dynamic pricing insights
* LLM-generated recommendation reasoning

---

# Technical Notes

### Security

All new tables:

* RLS enabled
* Organization scoped
* Principle of least privilege

---

### Frontend

All new components must include:

* Loading state
* Empty state
* Error state

---

### React Query

Use:

* Optimistic updates where safe
* Cache invalidation after mutations
* Retry strategy for transient failures

---

### UX Standards

* Mobile-first
* Responsive layouts
* 44px touch targets
* Existing design system consistency

---

# Delivery Order

### Round 1

Phase 0

* Harden role resolution
* Centralize RoleGuard
* Audit protected entry points

---

### Round 2

Phase 1

* Team invitations
* Auto role assignment
* Team management

---

### Round 3

Phase 2

* Gallery
* Reviews
* Ratings aggregation
* Reputation layer

---

### Round 4

Phase 3

* Payment submission
* Payment verification
* Receipt workflow

---

### Round 5

Phase 4 + Phase 5

* Capacity tracking
* Recommendation engine
* Subscription gating
* Explainability layer

---

# Success Criteria

By completion:

* No role race conditions
* Self-service organization management
* Strong marketplace trust signals
* Auditable payment workflows
* Capacity-aware matching
* Explainable recommendations
* Scalable foundation for future AI capabilities
