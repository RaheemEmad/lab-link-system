
# Mobile Navigation & Landing Page Testing and Enhancement Plan

## Current State Analysis

**Mobile Bottom Navigation**: ✅ Exists and properly configured
- Located in `src/components/layout/MobileBottomNav.tsx`  
- Has Profile link that navigates to `/profile`
- Shows on mobile viewports only (lg:hidden class)
- Includes proper role-based navigation (Dashboard, New Order/Marketplace, Alerts, Profile)

**Profile Page**: ✅ Functional but needs testing
- Located in `src/pages/Profile.tsx` - comprehensive 682-line settings page
- Includes user info, role display, password change, notification preferences, achievements
- Wrapped in ProtectedRoute, has proper loading states and error handling

**Landing Page Stats**: ❌ Currently hardcoded, needs real data
- `src/components/landing/LandingHero.tsx` has hardcoded stats: "2 min", "Zero", "100%"
- `src/components/landing/ProofSection.tsx` shows hardcoded "1,000+ Cases processed" and "12 Labs onboarded" 
- Database shows real data: **72 orders** and **16 active labs**

**Real-time Features**: ✅ Extensive but no "match lobby"
- This is LabLink, a dental lab management platform, not a matching/gaming app
- Real-time exists in: FeedbackRoom, OrderDashboard, notifications, chat, order tracking
- No "match lobby" functionality exists in the codebase

## Implementation Plan

### 1. Mobile Bottom Navigation Testing (P1)
- **Browser navigation** to test Profile link functionality on mobile viewport
- **Verify responsive behavior** at different mobile screen sizes (375px, 390px, 414px)
- **Test navigation states** and active/inactive indicators
- **Confirm safe area handling** on devices with notches/home indicators

### 2. Landing Page Stats Enhancement (P1) 
- **Create real-time stats hook** `useApplicationStats.tsx`:
  - Query orders count: `SELECT COUNT(*) FROM orders`
  - Query active labs count: `SELECT COUNT(*) FROM labs WHERE is_active = true`
  - Query processed cases: `SELECT COUNT(*) FROM orders WHERE status = 'Delivered'`
- **Update LandingHero.tsx** to use real database stats instead of hardcoded values
- **Update ProofSection.tsx** to show accurate "Cases processed" and "Labs onboarded" counts
- **Add loading states** and fallback to previous hardcoded values on error

### 3. Real-time Functionality Testing (P2)
Since there's no "match lobby", test existing real-time features:
- **FeedbackRoom real-time**: Open `/feedback-room/:orderId` in two tabs, test attachment uploads and comments sync
- **OrderDashboard real-time**: Open dashboard in two tabs, create/update order in one, verify updates in other
- **Chat real-time**: Open OrderChatWindow in two tabs, send messages, verify real-time sync
- **Notification real-time**: Trigger notifications, verify real-time popup and badge updates

### 4. Technical Implementation

**New Hook - `src/hooks/useApplicationStats.tsx`**:
```typescript
export const useApplicationStats = () => {
  return useQuery({
    queryKey: ['application-stats'],
    queryFn: async () => {
      const [ordersResult, labsResult, deliveredResult] = await Promise.all([
        supabase.from('orders').select('count', { count: 'exact', head: true }),
        supabase.from('labs').select('count', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('count', { count: 'exact', head: true }).eq('status', 'Delivered')
      ]);
      return {
        totalOrders: ordersResult.count || 0,
        activeLabs: labsResult.count || 0,
        processedCases: deliveredResult.count || 0
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

**Enhanced Landing Components**:
- Replace hardcoded values with dynamic stats
- Add loading skeletons for stats cards
- Implement error boundaries for graceful fallbacks

### 5. Testing Strategy

**Mobile Navigation Testing**:
1. Navigate to landing page
2. Set mobile viewport (375px width)
3. Sign in as doctor/lab staff user
4. Navigate to dashboard to activate bottom nav
5. Tap Profile icon and verify navigation to `/profile`
6. Test profile page loads correctly on mobile
7. Test navigation between all bottom nav items

**Real-time Features Testing**:
1. Open OrderDashboard in Tab 1
2. Open same dashboard in Tab 2  
3. Create new order in Tab 1
4. Verify order appears in Tab 2 without refresh
5. Update order status in Tab 2
6. Verify status change reflects in Tab 1

**Landing Stats Testing**:
1. Visit landing page
2. Verify stats show real database counts instead of hardcoded values
3. Check stats update periodically (5-minute cache)
4. Test error handling if database query fails

## Expected Outcomes

- ✅ Mobile navigation fully tested and working across all viewport sizes
- ✅ Profile page accessible and functional on mobile devices  
- ✅ Landing page displays accurate, real-time statistics from database
- ✅ Real-time features (OrderDashboard, FeedbackRoom, Chat) working in multi-tab scenarios
- ✅ Proper error handling and loading states for all enhanced features

## File Changes Required

**New Files**:
- `src/hooks/useApplicationStats.tsx`

**Modified Files**:  
- `src/components/landing/LandingHero.tsx`
- `src/components/landing/ProofSection.tsx`
