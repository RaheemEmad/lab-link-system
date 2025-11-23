# Auto-Assign Workflow E2E Tests

Comprehensive end-to-end tests for the Auto-Assign order marketplace workflow using Playwright.

## Setup

### 1. Install Dependencies

```bash
npm install
npx playwright install
```

### 2. Create Test Users (Automated)

The easiest way to set up test users is using the automated script:

```bash
# Run the automated test user creation
npm run create-test-users
```

This will automatically create:
- ✅ Doctor account (doctor.test@lablink.test)
- ✅ Lab staff account (lab.staff@lablink.test)
- ✅ Proper verification (onboarding_completed = true)
- ✅ Lab staff linked to test lab

**Test Credentials Created:**
```
Doctor Account:
  Email: doctor.test@lablink.test
  Password: TestDoctor123!
  Status: Verified & Authenticated

Lab Staff Account:
  Email: lab.staff@lablink.test
  Password: TestLabStaff123!
  Lab: Test Lab (ID: 00000000-0000-0000-0000-000000000001)
  Status: Verified & Authenticated
```

### 2b. Manual Setup (Alternative)

If the automated script doesn't work, you can create accounts manually:

#### Test Lab (Already Created)
- Lab ID: `00000000-0000-0000-0000-000000000001`
- Name: Test Lab - Auto-Assign Testing

#### Doctor Account (Manual)
1. Navigate to `/auth` in your app
2. Sign up with:
   - Email: `doctor.test@lablink.test`
   - Password: `TestDoctor123!`
3. Complete doctor onboarding

#### Lab Staff Account (Manual)
1. Navigate to `/auth`
2. Sign up with:
   - Email: `lab.staff@lablink.test`
   - Password: `TestLabStaff123!`
3. Complete lab staff onboarding
4. **Link to test lab** using SQL:

```sql
UPDATE user_roles
SET lab_id = '00000000-0000-0000-0000-000000000001'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'lab.staff@lablink.test')
AND role = 'lab_staff';
```

### 3. Verify Test Data

```bash
npm run verify-test-data
```

## Lab Verification & Marketplace Access

The system ensures only properly verified labs can access the marketplace:

**Verification System:**
- Labs must have `onboarding_completed = true` to access marketplace
- RLS policies enforce this at the database level
- Unverified labs cannot view orders or submit applications

**What Happens:**
1. Lab completes onboarding → `onboarding_completed` set to `true`
2. Marketplace queries check this flag automatically
3. Only verified labs can apply to orders

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test e2e/auto-assign-workflow.spec.ts
```

### Run tests in UI mode (recommended for debugging)
```bash
npx playwright test --ui
```

### Run tests in headed mode
```bash
npx playwright test --headed
```

### Run specific test
```bash
npx playwright test -g "Doctor submits auto-assign order"
```

### View test report
```bash
npx playwright show-report
```

## Test Coverage

### ✅ Core Workflow Tests

1. **Order Creation**
   - Doctor submits order without selecting lab
   - Order flagged as `auto_assign_pending = true`
   - Notifications sent to lab staff

2. **Notification Navigation**
   - Marketplace notifications navigate to `/orders-marketplace`
   - Lab request notifications navigate to `/lab-requests`
   - Other notifications navigate to `/dashboard`

3. **Marketplace Visibility**
   - Orders appear in marketplace for eligible labs
   - Order cards show correct information
   - Apply button is functional

4. **Application Flow**
   - Lab staff can apply to orders
   - Button changes to "Request Sent" after applying
   - Doctor receives notification

5. **Dashboard Filtering**
   - Lab dashboard only shows assigned orders
   - Marketplace orders are excluded from dashboard
   - Orders appear in dashboard only after acceptance

6. **Doctor Actions**
   - Accept lab application
   - Reject lab application
   - View pending applications

7. **Eligibility Rules**
   - Rejected labs cannot see order in marketplace
   - Rejected labs cannot reapply
   - Only one lab can be assigned per order

### 🧪 Edge Cases (Some Skipped Pending Setup)

1. Lab staff without `lab_id` sees warning
2. Order removed from marketplace after assignment
3. Cannot reapply to rejected order
4. Multiple labs applying to same order

## Test Data Structure

### Test Lab
```typescript
{
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Test Lab - Auto-Assign Testing',
  contact_email: 'testlab@lablink.test',
  is_active: true,
  performance_score: 8.5,
}
```

### Test Users
```typescript
{
  doctor: {
    email: 'doctor.test@lablink.test',
    password: 'TestDoctor123!',
    role: 'doctor'
  },
  labStaff: {
    email: 'lab.staff@lablink.test',
    password: 'TestLabStaff123!',
    role: 'lab_staff',
    lab_id: '00000000-0000-0000-0000-000000000001'
  }
}
```

## Troubleshooting

### Tests fail with "User not found"
- Ensure test users are created through the signup flow
- Verify credentials match exactly
- Check that onboarding is completed

### "Lab not assigned" errors
- Run the SQL to link lab staff to test lab
- Verify `lab_id` in `user_roles` table

### "No available orders" in marketplace
- Create a test order as doctor without selecting a lab
- Ensure `auto_assign_pending = true` and `assigned_lab_id IS NULL`

### Authentication issues
- Clear browser storage: `npx playwright test --clear-cache`
- Verify Supabase auth is configured correctly
- Check that auto-confirm email is enabled

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

1. **Run tests against a test/staging environment**, not production
2. **Clean up test data** after test runs (optional cleanup scripts)
3. **Use data-testid attributes** for reliable selectors
4. **Keep tests independent** - each test should work standalone
5. **Use page objects** for complex flows (future enhancement)

## Related Documentation

- [Auto-Assign Workflow Docs](../docs/AUTO_ASSIGN_WORKFLOW.md)
- [QA Checklist](../docs/AUTO_ASSIGN_QA_CHECKLIST.md)
- [Playwright Documentation](https://playwright.dev/)
