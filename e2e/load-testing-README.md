# Load Testing Guide

## Overview

This directory contains comprehensive load testing scripts to stress-test the LabLink application and identify performance bottlenecks under various load conditions.

## Test Levels

### 1. Light Load (@light)
- **Concurrent Users**: 10
- **Purpose**: Verify basic functionality under minimal load
- **Success Criteria**: 90%+ success rate

```bash
npx playwright test e2e/load-testing.spec.ts --grep "@light"
```

### 2. Medium Load (@medium)
- **Concurrent Users**: 50
- **Purpose**: Test typical production load
- **Success Criteria**: 85%+ success rate

```bash
npx playwright test e2e/load-testing.spec.ts --grep "@medium"
```

### 3. Heavy Load (@heavy)
- **Concurrent Users**: 100
- **Purpose**: Test high-traffic scenarios
- **Success Criteria**: 75%+ success rate

```bash
npx playwright test e2e/load-testing.spec.ts --grep "@heavy"
```

### 4. Stress Test (@stress)
- **Concurrent Users**: Variable
- **Purpose**: Find breaking points and verify rate limiting
- **Success Criteria**: Graceful degradation, proper rate limiting

```bash
npx playwright test e2e/load-testing.spec.ts --grep "@stress"
```

## What's Tested

### User Flows
1. **Login**: Authentication under load
2. **Order Creation**: Database write performance
3. **Order Browsing**: Database read performance with pagination
4. **Chat Messages**: Real-time communication under load

### Metrics Collected
- **Success Rate**: Percentage of successful operations
- **Response Time**: Average, min, max, P95
- **Error Rate**: Failed operations and reasons
- **Database Performance**: Query execution times

## Running Full Test Suite

```bash
# Run all load tests sequentially
npx playwright test e2e/load-testing.spec.ts

# Run with specific workers
npx playwright test e2e/load-testing.spec.ts --workers=4

# Run in headed mode to watch
npx playwright test e2e/load-testing.spec.ts --headed

# Generate HTML report
npx playwright test e2e/load-testing.spec.ts --reporter=html
```

## Interpreting Results

### Success Rates
- **90-100%**: Excellent - System handles load well
- **75-90%**: Good - Some degradation under load
- **50-75%**: Poor - Significant performance issues
- **<50%**: Critical - System unable to handle load

### Response Times
- **<500ms**: Excellent
- **500-1000ms**: Good
- **1000-3000ms**: Acceptable
- **>3000ms**: Poor - Needs optimization

### Common Bottlenecks

1. **Database Queries**
   - Symptom: Increasing response times under load
   - Solution: Add indexes, optimize queries, implement caching

2. **Rate Limiting**
   - Symptom: High failure rates at specific thresholds
   - Solution: Adjust rate limits, implement queue systems

3. **Memory Leaks**
   - Symptom: Degrading performance over time
   - Solution: Profile memory usage, fix leaks

4. **Network Latency**
   - Symptom: Variable response times
   - Solution: CDN, compression, connection pooling

## Best Practices

### Before Testing
1. Ensure test environment matches production
2. Warm up the system with light load first
3. Monitor system resources (CPU, RAM, DB connections)
4. Clear caches if testing cold performance

### During Testing
1. Monitor application logs for errors
2. Watch database performance metrics
3. Check rate limiting behavior
4. Observe memory usage trends

### After Testing
1. Review metrics summary
2. Identify slowest operations
3. Compare against baseline metrics
4. Document any bottlenecks found

## Continuous Load Testing

### Integration with CI/CD
```yaml
# Example GitHub Actions workflow
name: Load Tests
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npx playwright test e2e/load-testing.spec.ts
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: load-test-results
          path: playwright-report/
```

## Scaling Recommendations

Based on test results:

### If experiencing high load issues:
1. **Vertical Scaling**: Increase server resources
2. **Horizontal Scaling**: Add more instances
3. **Database Optimization**: Add indexes, partitioning
4. **Caching Layer**: Implement Redis/Memcached
5. **CDN**: Offload static assets
6. **Connection Pooling**: Optimize database connections

### If rate limiting is too restrictive:
1. Review business requirements
2. Implement tiered rate limits
3. Add burst allowances
4. Consider queue-based processing

## Monitoring in Production

After load testing, set up monitoring:
1. **Application Performance Monitoring (APM)**
   - New Relic, DataDog, or similar
   
2. **Database Monitoring**
   - Supabase Analytics
   - Query performance tracking
   
3. **Error Tracking**
   - Sentry, Rollbar
   
4. **User Metrics**
   - Real User Monitoring (RUM)
   - Core Web Vitals

## Support

For issues or questions:
- Review application logs
- Check database performance metrics
- Consult performance monitoring dashboards
- Review this guide for optimization tips
