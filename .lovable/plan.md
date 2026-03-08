

# Plan: Merge Track Orders, Calendar, Analytics & Appointments into Logistics Page

## Overview
Consolidate 4 separate pages (TrackOrders, LabCalendar, Analytics, AppointmentScheduling) into the existing **LogisticsDashboard** as tabbed sections. Remove them as standalone routes and update all navigation references.

## Current State
- `LogisticsDashboard.tsx` has 2 tabs: **Shipments** and **Billing**
- `TrackOrders.tsx` — shipment tracking with inline editing (lab) / read-only (doctor)
- `LabCalendar.tsx` — calendar grid with availability manager (lab-only)
- `Analytics.tsx` — role-based analytics (doctor spending / lab revenue)
- `AppointmentScheduling.tsx` — pickup/delivery scheduling

## New Tab Structure

The Logistics page will have **5 tabs** (role-aware visibility):

| Tab | Source | Visible To |
|-----|--------|-----------|
| **Shipments** | Existing LogisticsDashboard shipments content | All |
| **Tracking** | TrackOrders page content | All |
| **Calendar** | LabCalendar page content | Lab staff + Admin |
| **Analytics** | Analytics page content | All |
| **Scheduling** | AppointmentScheduling page content | All |
| **Billing** | Existing BillingTab | All |

## Implementation Steps

### 1. Extract page content into reusable components
Each page currently wraps content in `ProtectedRoute > LandingNav > content > LandingFooter`. We extract just the **inner content** into tab-friendly components:

- `src/components/logistics/TrackingTabContent.tsx` — extracted from TrackOrders.tsx (data fetching + order cards + inline editing)
- `src/components/logistics/CalendarTabContent.tsx` — extracted from LabCalendar.tsx (calendar grid + availability)
- `src/components/logistics/AnalyticsTabContent.tsx` — extracted from Analytics.tsx (doctor/lab analytics views)
- `src/components/logistics/SchedulingTabContent.tsx` — extracted from AppointmentScheduling.tsx (appointment CRUD)

### 2. Refactor LogisticsDashboard.tsx
- Add 4 new tab triggers (Tracking, Calendar, Analytics, Scheduling) alongside existing Shipments and Billing
- Conditionally show Calendar tab only for lab_staff/admin
- Import and render the new content components in each TabsContent
- Use a responsive scrollable TabsList for mobile

### 3. Update routing in App.tsx
- Keep `/logistics` route pointing to LogisticsDashboard
- Remove standalone routes: `/track-orders`, `/lab-calendar`, `/analytics`, `/appointments`
- Add redirects from old routes to `/logistics` (optional, or just remove)

### 4. Update Dashboard.tsx navigation buttons
- Remove individual buttons for Track Orders, Calendar, Analytics, Appointments
- Keep/update the single **Logistics** button that navigates to `/logistics`
- Optionally pass a tab query param: `/logistics?tab=analytics`

### 5. Update any other references
- Search for links to `/track-orders`, `/lab-calendar`, `/analytics`, `/appointments` across the codebase and update them to `/logistics?tab=<name>`

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/logistics/TrackingTabContent.tsx` |
| Create | `src/components/logistics/CalendarTabContent.tsx` |
| Create | `src/components/logistics/AnalyticsTabContent.tsx` |
| Create | `src/components/logistics/SchedulingTabContent.tsx` |
| Major Modify | `src/pages/LogisticsDashboard.tsx` — add 4 new tabs |
| Modify | `src/pages/Dashboard.tsx` — consolidate nav buttons |
| Modify | `src/App.tsx` — remove 4 standalone routes |
| Keep | Original page files (TrackOrders, LabCalendar, Analytics, AppointmentScheduling) as thin re-exports or remove entirely |
| Modify | Any files linking to removed routes |

