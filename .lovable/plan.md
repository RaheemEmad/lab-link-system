

# Fix: Bell and InboxIcon ReferenceError

## Root Cause
The imports are syntactically correct in all files. Both `Bell` and `Inbox` are valid lucide-react v0.462.0 exports. This is a **stale Vite HMR cache** issue — the bundler cached old module versions before these imports were added in the last edit cycle.

## Fix Strategy
Re-save the three affected files with trivial changes to force Vite to re-process the module graph. Specifically:

### 1. `src/components/landing/LandingNav.tsx` (line 6)
Split the large icon import into two lines for clarity and to force re-parse:
```tsx
import { Menu, X, Download, Bell, User, LogOut, Trophy, Star } from "lucide-react";
import { Building2, Truck, Shield, Plus, FilePlus, Package, Settings, Inbox as InboxIcon } from "lucide-react";
```

### 2. `src/components/layout/MobileBottomNav.tsx` (line 6)
Same approach — split import:
```tsx
import { LayoutDashboard, Plus, Store, User } from "lucide-react";
import { Inbox } from "lucide-react";
```

### 3. `src/pages/Inbox.tsx` (lines 13-24)
Re-save with split imports:
```tsx
import { Inbox as InboxIcon, MessageSquare, Palette, PackageCheck, Receipt } from "lucide-react";
import { Reply, CheckCircle2, XCircle, CreditCard, RefreshCw } from "lucide-react";
```

No logic changes. This forces the bundler to reprocess the icon imports from scratch.

