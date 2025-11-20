# Tooltip System Documentation

## Overview

LabLink now features comprehensive tooltips across all navigation elements and interactive buttons. Tooltips provide helpful context and guidance when users hover over UI elements, improving user experience and discoverability.

## Implementation

### Component Structure

Tooltips are implemented using shadcn/ui's Tooltip component with the following structure:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Wrap your app section with TooltipProvider
<TooltipProvider delayDuration={200}>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button>Your Button</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Helpful tooltip text</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Configuration

- **Delay Duration**: 200ms before tooltip appears
- **Trigger**: Mouse hover (desktop) or tap-hold (mobile)
- **Position**: Automatically adjusted based on viewport

## Tooltip Locations

### Navigation Menu (LandingNav.tsx)

#### Logo
- **Tooltip**: "Go to home page"
- **Action**: Navigates to home

#### Left Navigation Links
- **How It Works**: "Scroll to how it works"
- **About**: "Navigate to About"
- **Contact**: "Navigate to Contact"
- **Dashboard** (logged in): "Navigate to Dashboard"

#### Right Navigation (Logged In)
- **Notifications**: "View X unread notification(s)" or "View all notifications"
- **Profile**: "View and edit your profile"
- **Sign Out**: "Sign out of your account"

#### Right Navigation (Logged Out)
- **Sign In**: "Sign in to your account"
- **Sign Up**: "Create a new account"

### Dashboard Page

#### Back Button
- **Tooltip**: "Return to home page"
- **Action**: Navigates to home

#### Notifications Button
- **Tooltip**: "You have X unread notification(s)" or "View notification history"
- **Action**: Opens notification history
- **Badge**: Shows unread count

#### New Order Button
- **Tooltip**: "Create a new dental lab order"
- **Action**: Opens new order form

### Notification History Page

#### Back Button
- **Tooltip**: "Go back to previous page"
- **Action**: Browser back navigation

#### Mark All Read Button
- **Tooltip**: "Mark all X notification(s) as read"
- **Action**: Marks all unread notifications as read
- **Visibility**: Only shown when there are unread notifications

## Tooltip Content Guidelines

### Best Practices

1. **Be Concise**: Keep tooltips to 1-2 lines
2. **Action-Oriented**: Use action verbs (View, Navigate, Create, etc.)
3. **Contextual**: Provide context that isn't immediately obvious
4. **Consistent**: Use similar language patterns across the app

### Tooltip Writing Patterns

#### Navigation Actions
- Format: "Navigate to [Page Name]"
- Example: "Navigate to Dashboard"

#### View Actions
- Format: "View [what user will see]"
- Example: "View notification history"

#### Create Actions
- Format: "Create [what will be created]"
- Example: "Create a new dental lab order"

#### Status Information
- Format: "[Status description]"
- Example: "You have 3 unread notifications"

#### Authentication
- Format: "[Action] [context]"
- Example: "Sign in to your account"

## Dynamic Tooltips

Some tooltips change based on application state:

### Notification Badge
```tsx
{unreadCount && unreadCount > 0 
  ? `View ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` 
  : 'View all notifications'}
```

### Conditional Display
```tsx
{unreadCount > 0 && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button>Mark All Read</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Mark all {unreadCount} notification{unreadCount > 1 ? 's' : ''} as read</p>
    </TooltipContent>
  </Tooltip>
)}
```

## Mobile Considerations

### Touch Devices
- Tooltips appear on tap-hold (long press)
- Duration: 500ms hold required
- Automatically dismissed on next tap

### Responsive Behavior
- Tooltips remain functional on all screen sizes
- Content automatically repositions to stay in viewport
- Works within mobile hamburger menu

## Accessibility

### Keyboard Navigation
- Tooltips are focusable via Tab key
- Content appears on focus, not just hover
- Keyboard users get same information

### Screen Readers
- Tooltip content is announced to screen readers
- Uses ARIA labels and descriptions
- Semantic HTML structure

### Color Contrast
- Tooltip background: High contrast with text
- Follows WCAG 2.1 AA standards
- Readable in light and dark modes

## Adding New Tooltips

### Step 1: Import Components
```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

### Step 2: Wrap Section with Provider
```tsx
<TooltipProvider delayDuration={200}>
  {/* Your content with tooltips */}
</TooltipProvider>
```

### Step 3: Add Tooltip to Element
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button onClick={handleAction}>
      Action Button
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Clear, concise description of action</p>
  </TooltipContent>
</Tooltip>
```

### Important Notes
- Use `asChild` prop on TooltipTrigger to avoid wrapper elements
- Keep delay duration consistent (200ms)
- Test tooltip positioning near viewport edges
- Ensure tooltip text is helpful, not redundant

## Performance

### Optimization
- Tooltips are lightweight and don't impact performance
- No network requests required
- Rendered only when hovered/focused
- Automatically garbage collected when dismissed

### Bundle Size
- Minimal impact on bundle size
- Tree-shaking removes unused tooltip styles
- Shared across all tooltip instances

## Future Enhancements

### Planned Features
- Rich tooltips with icons and formatting
- Keyboard shortcut hints in tooltips
- Tutorial mode with sequential tooltips
- Custom tooltip positioning options
- Tooltip delay preferences in user settings

### Potential Improvements
- Animated entrances/exits
- Tooltip themes (info, warning, success)
- Multi-line tooltips with bullet points
- Image/icon tooltips
- Tooltip analytics (track which tooltips users view most)

## Testing

### Manual Testing Checklist

1. **Desktop**:
   - Hover over each button/link
   - Verify tooltip appears after 200ms
   - Check tooltip content is correct
   - Ensure tooltip doesn't block interaction
   - Test near viewport edges

2. **Mobile**:
   - Long press on buttons
   - Verify tooltip appears
   - Check tap to dismiss works
   - Test in portrait and landscape

3. **Keyboard**:
   - Tab through interactive elements
   - Verify tooltips appear on focus
   - Test Esc key dismisses tooltip

4. **Screen Readers**:
   - Enable screen reader
   - Navigate through buttons
   - Verify tooltip content is announced

## Troubleshooting

### Tooltip Not Appearing
- Check TooltipProvider wraps the component
- Verify delay duration is set
- Ensure trigger element is interactive
- Check z-index stacking context

### Tooltip Position Issues
- Tooltip automatically repositions near edges
- Check parent containers don't have overflow: hidden
- Verify viewport meta tag is correct

### Performance Issues
- Too many TooltipProviders can cause issues
- Use one provider per page/section
- Don't nest TooltipProviders unnecessarily

### Content Not Updating
- Ensure dynamic content variables are in scope
- Check React re-renders are happening
- Verify conditional logic is correct

## Code Examples

### Basic Tooltip
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button>Hover Me</Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>I'm a tooltip!</p>
  </TooltipContent>
</Tooltip>
```

### Dynamic Content
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button>
      Messages
      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>
      {unreadCount > 0 
        ? `You have ${unreadCount} unread messages` 
        : 'No new messages'}
    </p>
  </TooltipContent>
</Tooltip>
```

### Icon-Only Button
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon">
      <Settings className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Open settings</p>
  </TooltipContent>
</Tooltip>
```

### Disabled Element
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div>
      <Button disabled>
        Disabled Action
      </Button>
    </div>
  </TooltipTrigger>
  <TooltipContent>
    <p>This action is currently unavailable</p>
  </TooltipContent>
</Tooltip>
```

Note: Wrap disabled buttons in a div for tooltips to work properly.
