# Test User Setup Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "create-test-users": "tsx e2e/create-test-users.ts",
    "verify-test-data": "tsx e2e/setup-test-data.ts"
  }
}
```

These scripts help automate test data creation for E2E testing.
