# Notification System Documentation

## Overview

LabLink now features a comprehensive notification system that tracks and displays all order-related activities. Users can view their complete notification history, filter by read/unread status, and quickly navigate to relevant orders.

## Features

### 1. Notification History Page
- **Location**: `/notifications`
- **Access**: Available from navigation menu and dashboard
- **Features**:
  - View all notifications in chronological order
  - Filter between "All" and "Unread" notifications
  - See unread count badge
  - Mark individual notifications as read (auto-marks on click)
  - Mark all notifications as read with one click
  - Click any notification to navigate to the relevant order
  - Relative timestamps ("2 hours ago", "yesterday", etc.)

### 2. Notification Types
- **Status Change**: Triggered when an order status is updated
  - Notifies: Doctor + assigned lab staff
  - Shows: Old status → New status
- **New Note**: Triggered when a note is added to an order
  - Notifies: Doctor + assigned lab staff (except author)
  - Shows: Author name + order details
- **Assignment** (future): When lab staff is assigned to an order

### 3. Real-Time Updates
- Dashboard shows live unread notification count
- Count refreshes every 30 seconds automatically
- Badge appears when unread notifications exist
- Navigation menu includes "Notifications" link

## Database Schema

### notifications Table
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- order_id: UUID (references orders)
- type: TEXT ('status_change', 'new_note', 'assignment')
- title: TEXT
- message: TEXT
- read: BOOLEAN (default: false)
- created_at: TIMESTAMP
```

### Indexes
- `idx_notifications_user_id`: Fast user lookups
- `idx_notifications_created_at`: Chronological ordering
- `idx_notifications_read`: Filter by read status

## How It Works

### Automatic Notification Creation

#### Status Changes
When an order status is updated:
1. Trigger `on_order_status_change` fires
2. Function `notify_order_status_change()` executes
3. Creates notifications for:
   - The doctor who created the order
   - All lab staff assigned to the order
4. Notification stored in database

#### New Notes
When a note is added to an order:
1. Trigger `on_new_note` fires
2. Function `notify_new_note()` executes
3. Creates notifications for:
   - The doctor (if not the author)
   - All assigned lab staff (except author)
4. Notification stored in database

### User Actions

#### Viewing Notifications
1. User clicks "Notifications" in nav or dashboard
2. Query fetches user's notifications with order details
3. Displays in chronological order (newest first)
4. Shows unread count in UI

#### Reading Notifications
1. User clicks a notification
2. Auto-marks as read if unread
3. Navigates to order detail view
4. Dashboard count updates automatically

#### Mark All as Read
1. User clicks "Mark All Read" button
2. Updates all unread notifications for user
3. Badge disappears
4. UI refreshes

## Security (RLS Policies)

### View Notifications
- Users can only see their own notifications
- `USING (auth.uid() = user_id)`

### Update Notifications
- Users can only update their own notifications
- Used for marking as read
- `USING (auth.uid() = user_id)`

### Create Notifications
- System-level creation via triggers
- `WITH CHECK (true)` for trigger functions
- Users cannot manually create notifications

## UI Components

### Notification Card
- Icon based on type (📊, 📝, 👤, 🔔)
- Title and message
- Relative timestamp
- "New" badge for unread
- Highlighted background for unread
- Click to navigate

### Filters/Tabs
- "All Notifications": Shows everything
- "Unread": Shows only unread items
- Count badge shows unread number

### Empty States
- Different messages for "All" vs "Unread"
- Helpful explanation text
- Icon for visual appeal

## Integration Points

### Navigation Menu
- Link added to `userLinks` in `LandingNav.tsx`
- Appears when user is logged in
- Between "Dashboard" and "Profile"

### Dashboard Header
- Notification bell button with badge
- Shows real-time unread count
- Auto-refreshes every 30 seconds
- Click to view notification history

### Order Actions
- Status changes automatically trigger notifications
- Note additions automatically trigger notifications
- No manual action needed

## Future Enhancements

### Planned Features
- Push notifications integration (already partially implemented)
- Email notifications for important updates
- Notification preferences (disable certain types)
- Notification grouping (multiple updates for same order)
- Archive/delete old notifications
- Export notification history
- Notification search functionality

### Technical Improvements
- Real-time updates via Supabase Realtime
- Batch notification sending
- Notification throttling (prevent spam)
- Rich notification content (images, buttons)
- Notification templates

## Troubleshooting

### Notifications Not Appearing
1. Check if triggers are enabled:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE 'on_%';
   ```
2. Verify RLS policies allow reading
3. Check user_id matches auth.uid()
4. Ensure order_id exists in orders table

### Unread Count Not Updating
1. Check query is enabled (user logged in)
2. Verify refetch interval (30s default)
3. Clear React Query cache
4. Check network tab for API calls

### Can't Mark as Read
1. Verify RLS UPDATE policy
2. Check user owns notification
3. Ensure notification ID is correct
4. Check for database errors in console

## Testing

### Manual Testing Steps

1. **Create notifications**:
   - Change an order status
   - Add a note to an order
   - Verify notification appears in database

2. **View notifications**:
   - Navigate to /notifications
   - Check all notifications display
   - Verify order details are shown

3. **Mark as read**:
   - Click a notification
   - Verify it navigates to order
   - Check notification is marked read
   - Confirm unread count decreases

4. **Filter notifications**:
   - Switch between "All" and "Unread" tabs
   - Verify correct notifications show
   - Check empty states work

5. **Mark all as read**:
   - Click "Mark All Read" button
   - Verify all become read
   - Check unread count goes to 0

## Performance Considerations

- Indexes on frequently queried columns
- Limited to user's own notifications (RLS)
- Pagination recommended for large datasets (not yet implemented)
- Refetch interval to balance freshness vs. load
- Query only fetches necessary fields

## Code Examples

### Fetch Notifications
```typescript
const { data: notifications } = useQuery({
  queryKey: ["notifications", user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select(`*, orders (order_number, patient_name)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data;
  },
});
```

### Mark as Read
```typescript
await supabase
  .from("notifications")
  .update({ read: true })
  .eq("id", notificationId);
```

### Get Unread Count
```typescript
const { count } = await supabase
  .from("notifications")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)
  .eq("read", false);
```
