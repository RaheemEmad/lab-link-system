

# Add "Back to Dashboard" Button to Calendar, Analytics, and Scheduling Pages

## Problem
The Lab Calendar, Analytics, and Appointment Scheduling pages lack a quick way to navigate back. They already have the header (LandingNav) and footer (LandingFooter), so the fix is adding a **"Back to Dashboard"** button at the top of each page's content area.

## Changes

### Pattern
Add a back button using `useNavigate()` from react-router-dom with `ArrowLeft` icon, placed just above the page title on each page.

```tsx
<Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-2">
  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
</Button>
```

### Files to Modify

1. **`src/pages/Analytics.tsx`** — Add back button above the "Analytics Dashboard" heading
2. **`src/pages/LabCalendar.tsx`** — Add back button above the breadcrumb/heading
3. **`src/pages/AppointmentScheduling.tsx`** — Add back button above the page heading

Each file already imports `Button` and `lucide-react` icons. Just add `useNavigate` from `react-router-dom` and the `ArrowLeft` icon import.

