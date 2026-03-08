

# Plan: Add PDF Export Option Alongside CSV Across All Export Points

## Summary
Add a reusable `exportToPDF` utility and an `ExportDropdown` component, then replace every "Export CSV" button with a dropdown offering both CSV and PDF options.

## 1. New Utility: `exportToPDF` in `src/lib/exportUtils.ts`
- Add a generic `exportToPDF(data, columns, title, filename)` function that opens a print window with a styled HTML table (similar pattern already used in `StatementGenerator` and `MonthlyBillingSummary`)
- Reusable across all export points

## 2. New Component: `src/components/ui/export-dropdown.tsx`
- A small dropdown button component:
  - Props: `onExportCSV`, `onExportPDF`, `disabled?`, `variant?`, `size?`
  - Renders a `DropdownMenu` with a `Download` icon trigger button labeled "Export"
  - Two items: "Export as CSV" and "Export as PDF"
- This ensures consistent UI everywhere

## 3. Replace All Export Buttons (8 locations)

| File | Current | Change |
|------|---------|--------|
| `src/components/OrderDashboard.tsx` (~line 376) | "Export CSV" button | `ExportDropdown` with CSV + PDF handlers |
| `src/components/admin/AdminActivityTab.tsx` (~line 88) | "Export CSV" button | `ExportDropdown` |
| `src/components/admin/AdminCommunicationTab.tsx` (~line 127) | "Export CSV" button | `ExportDropdown` |
| `src/components/admin/AdminOrdersTab.tsx` (~line 269) | "Export CSV" button | `ExportDropdown` |
| `src/components/admin/AdminUsersTab.tsx` (~line 327) | "Export CSV" button | `ExportDropdown` |
| `src/pages/Analytics.tsx` (~lines 296, 401) | Two "Export CSV" buttons | `ExportDropdown` for both |
| `src/components/logistics/AnalyticsTabContent.tsx` (~lines 150, 214) | Two "Export CSV" buttons | `ExportDropdown` for both |

Files already having PDF-only export (InvoicePreview, MonthlyBillingSummary, StatementGenerator) will also get the CSV option added via the same dropdown pattern.

## Files Changed
| File | Action |
|------|--------|
| `src/lib/exportUtils.ts` | Add `exportToPDF()` |
| `src/components/ui/export-dropdown.tsx` | **Create** — reusable dropdown |
| `src/components/OrderDashboard.tsx` | Swap button → dropdown |
| `src/components/admin/AdminActivityTab.tsx` | Swap button → dropdown |
| `src/components/admin/AdminCommunicationTab.tsx` | Swap button → dropdown |
| `src/components/admin/AdminOrdersTab.tsx` | Swap button → dropdown |
| `src/components/admin/AdminUsersTab.tsx` | Swap button → dropdown |
| `src/pages/Analytics.tsx` | Swap buttons → dropdowns |
| `src/components/logistics/AnalyticsTabContent.tsx` | Swap buttons → dropdowns |
| `src/components/billing/InvoicePreview.tsx` | Add CSV option alongside existing PDF |
| `src/components/billing/MonthlyBillingSummary.tsx` | Add CSV option alongside existing PDF |
| `src/components/billing/StatementGenerator.tsx` | Add CSV option alongside existing Export |

