# Push Notifications & PWA Features

## Features Added

### 1. App Update Notifications
- Automatic detection of new app versions
- Toast notification with "Reload to Update" button
- Seamless update experience without losing user state

### 2. Push Notifications
- Real-time browser notifications for:
  - Order status changes
  - New notes added to orders
- User-controlled subscription management
- Works on desktop and mobile browsers

## How Push Notifications Work

### For Users

1. **Enable Notifications**:
   - Go to Profile page
   - Find "Push Notifications" in Notification Preferences
   - Click "Enable" button
   - Accept browser permission prompt

2. **Receiving Notifications**:
   - You'll receive notifications when:
     - Order status changes (if enabled in preferences)
     - New notes are added to your orders (if enabled in preferences)
   - Click notification to open the order in LabLink

3. **Disable Notifications**:
   - Go back to Profile page
   - Click "Disable" button under Push Notifications

### Technical Implementation

#### Database Schema
- `push_subscriptions` table stores user notification subscriptions
- Triggers on `orders` table detect status changes
- Triggers on `order_notes` table detect new notes

#### Edge Function
The `send-push-notification` edge function handles:
- Fetching relevant user subscriptions
- Sending push notifications via Web Push API
- Managing notification delivery

#### Frontend Integration
- `usePushNotifications` hook manages subscription state
- Service worker handles notification display and clicks
- Automatic permission requests

## VAPID Keys Setup

**IMPORTANT**: For production, you need to generate proper VAPID keys:

```bash
# Generate VAPID keys (Node.js example)
npx web-push generate-vapid-keys
```

Then add them as secrets:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

The current implementation uses placeholder keys. Replace them in:
1. `src/hooks/usePushNotifications.tsx` (public key)
2. Edge function environment (both keys)

## Browser Compatibility

Push notifications work in:
- Chrome/Edge (desktop & Android)
- Firefox (desktop & Android)
- Safari (macOS & iOS 16.4+)

## Security Notes

⚠️ **Password Protection**: A security warning was detected during migration regarding leaked password protection. This is a general authentication security setting. To enable it:

1. Open Lovable Cloud settings
2. Navigate to Authentication settings
3. Enable "Password Strength and Leaked Password Protection"
4. This will check user passwords against known leaked password databases

## Testing

### Test Update Notifications
1. Make code changes
2. Deploy new version
3. Keep app open in browser
4. New version will trigger "Update Available" toast

### Test Push Notifications
1. Enable notifications in Profile
2. Create a test order
3. Change order status or add a note
4. Notification should appear

## Troubleshooting

### Notifications Not Working
- Check browser permissions (Settings → Site Settings)
- Ensure service worker is registered
- Check console for errors
- Verify VAPID keys are configured

### Update Toast Not Appearing
- Check if service worker is enabled
- Verify PWA is properly installed
- Check browser console for SW errors

## Future Enhancements

- Email notification templates
- SMS notifications (when phone numbers are provided)
- Notification history page
- Custom notification sounds
- Notification grouping by order
