# Autosave & Conflict Resolution Implementation Guide

## ✅ Completed Components

### 1. Core Autosave Hook (`src/hooks/useFormAutosave.tsx`)
- Automatic form data saving to localStorage
- Configurable debounce timing
- Draft recovery on component mount
- Toast notifications for save status
- **Status**: ✅ Fully implemented

### 2. Autosave Indicator (`src/components/ui/autosave-indicator.tsx`)
- Visual feedback for save states (saving, saved, not saved)
- Time-ago display for last save
- Recovery status indication
- Animated icons for visual feedback
- **Status**: ✅ Fully implemented

### 3. Conflict Resolution Hook (`src/hooks/useConflictResolution.tsx`)
- Detects when server data is newer than local autosaved data
- Supports custom conflict resolution strategies: use_server, use_local, merge
- Automatic conflict notifications
- Prevents data loss from concurrent edits
- **Status**: ✅ Fully implemented

### 4. Demo Page (`src/pages/AutosaveDemo.tsx`)
- Interactive demonstration of autosave features
- Implementation guide with code examples
- Test environment for autosave functionality
- **Route**: `/autosave-demo`
- **Status**: ✅ Fully implemented

### 5. Order Form (`src/components/OrderForm.tsx`)
- Integrated autosave with 2-second debounce
- Draft recovery on page load
- Automatic draft clearance on successful submission
- Autosave indicator in form header
- **Status**: ✅ Fully implemented

### 6. Edit Order Page (`src/pages/EditOrder.tsx`)
- Autosave with conflict detection
- Warns when server data has changed
- Preserves local changes across sessions
- Modified field indicators
- **Status**: ✅ Fully implemented

## 📋 Implementation Checklist for Remaining Forms

### High Priority Forms

#### 1. Profile Updates (`src/pages/Profile.tsx`)
```typescript
// Add autosave imports
import { useFormAutosave } from "@/hooks/useFormAutosave";
import { AutosaveIndicator } from "@/components/ui/autosave-indicator";

// Setup autosave
const { saveData, clearSavedData, autosaveState } = useFormAutosave({
  storageKey: 'profile-form',
  debounceMs: 2000,
  onRecover: (data) => {
    setFullName(data.fullName || '');
    setPhone(data.phone || '');
    // ... recover other fields
  },
});

// Watch for changes
useEffect(() => {
  saveData({ fullName, phone, emailNotifications, smsNotifications });
}, [fullName, phone, emailNotifications, smsNotifications, saveData]);

// Clear on submit success
const handleProfileUpdate = async () => {
  // ... existing logic
  clearSavedData();
};
```

#### 2. Lab Application Responses (`src/pages/LabRequestsManagement.tsx`)
```typescript
// Per-request autosave with unique keys
const { saveData, clearSavedData, autosaveState } = useFormAutosave({
  storageKey: `lab-response-${requestId}`,
  debounceMs: 1500,
  onRecover: (data) => {
    setResponseMessage(data.message);
    setProposedDate(data.proposedDate);
  },
});
```

#### 3. Order Notes Dialog (`src/components/order/OrderNotesDialog.tsx`)
```typescript
// Modal-specific autosave
const { saveData, clearSavedData, autosaveState } = useFormAutosave({
  storageKey: `order-note-${orderId}`,
  debounceMs: 1000,
  onRecover: (data) => setNoteText(data.text),
  enabled: isOpen, // Only save when modal is open
});

// Clear when note is posted
const handlePostNote = async () => {
  // ... post note logic
  clearSavedData();
  setNoteText('');
};
```

#### 4. Order Status Updates (`src/components/order/OrderStatusDialog.tsx`)
```typescript
const { saveData, clearSavedData, autosaveState } = useFormAutosave({
  storageKey: `status-update-${orderId}`,
  debounceMs: 1500,
  onRecover: (data) => {
    setSelectedStatus(data.status);
    setNotes(data.notes);
  },
  enabled: isOpen,
});
```

#### 5. Shipment Details (`src/components/order/ShipmentDetailsDialog.tsx`)
```typescript
const { saveData, clearSavedData, autosaveState } = useFormAutosave({
  storageKey: `shipment-${orderId}`,
  debounceMs: 2000,
  onRecover: (data) => {
    setCarrierName(data.carrierName);
    setTrackingNumber(data.trackingNumber);
    // ... recover all fields
  },
  enabled: isOpen,
});
```

## 🔧 Implementation Pattern for All Forms

### Step 1: Import Dependencies
```typescript
import { useFormAutosave } from "@/hooks/useFormAutosave";
import { AutosaveIndicator } from "@/components/ui/autosave-indicator";
import { useConflictResolution } from "@/hooks/useConflictResolution"; // If needed
```

### Step 2: Setup Autosave Hook
```typescript
const { saveData, clearSavedData, autosaveState } = useFormAutosave({
  storageKey: 'unique-form-key',
  debounceMs: 2000, // 2 seconds
  onRecover: (data) => {
    // Populate form with recovered data
  },
  enabled: true, // Use for conditional enabling (modals)
});
```

### Step 3: Add Conflict Detection (For Database-backed Forms)
```typescript
const { checkForConflicts, resolveConflict, conflictState } = useConflictResolution({
  tableName: 'table_name',
  recordId: recordId,
  onConflict: (serverData, localData) => 'use_local',
  enabled: !!recordId,
});
```

### Step 4: Watch Form Changes
```typescript
// For react-hook-form
useEffect(() => {
  const subscription = form.watch((values) => {
    saveData(values);
  });
  return () => subscription.unsubscribe();
}, [form.watch, saveData]);

// For useState
useEffect(() => {
  saveData({ field1, field2, field3 });
}, [field1, field2, field3, saveData]);
```

### Step 5: Add Indicator to UI
```typescript
<CardHeader>
  <div className="flex items-center justify-between">
    <div>
      <CardTitle>Form Title</CardTitle>
      <CardDescription>Form description</CardDescription>
    </div>
    <AutosaveIndicator 
      isSaving={autosaveState.isSaving}
      lastSaved={autosaveState.lastSaved}
      hasRecoveredData={autosaveState.hasRecoveredData}
    />
  </div>
</CardHeader>
```

### Step 6: Clear on Success
```typescript
const onSubmit = async (data) => {
  try {
    // ... submit logic
    clearSavedData(); // Clear draft after success
    toast.success("Saved successfully!");
  } catch (error) {
    // Keep autosaved data on error
    toast.error("Save failed. Draft preserved.");
  }
};
```

## 🎯 Best Practices

### Storage Keys
- Use descriptive, unique keys: `'order-form'`, `'edit-order-${id}'`
- Include record IDs for edit forms: `'edit-profile-${userId}'`
- Use context for modals: `'modal-${modalType}-${recordId}'`

### Debounce Timing
- **Fast inputs** (search, filters): 500-1000ms
- **Standard forms**: 1500-2000ms
- **Large forms**: 2000-3000ms

### Conflict Resolution
- **Single-user forms**: No conflict detection needed
- **Multi-user edits**: Always use conflict detection
- **Real-time data**: Check conflicts before save

### Error Handling
- Keep autosaved data on submission errors
- Only clear on successful submission
- Show recovery notification on mount
- Log failures silently, don't block UI

## 📊 Autosave Coverage Status

| Form/Component | Priority | Status | Conflicts? |
|----------------|----------|---------|------------|
| Order Form | High | ✅ Done | No |
| Edit Order | High | ✅ Done | Yes |
| Profile | High | ⏳ Ready | No |
| Lab Requests | High | ⏳ Ready | Optional |
| Order Notes | Medium | ⏳ Ready | No |
| Status Updates | Medium | ⏳ Ready | No |
| Shipment Details | Medium | ⏳ Ready | No |
| QC Checklist | Low | ⏳ Ready | No |

## 🚀 Next Steps

1. **Apply to Profile page** - High user impact
2. **Add to Lab Request responses** - Prevents work loss
3. **Implement in modal dialogs** - Enhanced UX
4. **Add inline edit autosave** - For future features
5. **Monitor localStorage usage** - Add cleanup for old drafts

## 🔒 Security Considerations

- Autosave data is stored in localStorage (client-side only)
- No sensitive data like passwords should be autosaved
- Storage keys should not contain sensitive information
- Clear drafts after successful submission
- Consider implementing draft expiration (e.g., 7 days)

## 📱 Mobile Considerations

- Autosave is especially valuable on mobile (connection issues)
- Indicator should be responsive (hidden/shown appropriately)
- Consider vibration feedback on recovery
- Test with slow connections
