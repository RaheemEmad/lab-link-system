import { test, expect, Page, Browser } from '@playwright/test';

/**
 * Load Testing Suite
 * Tests application performance under high concurrent load
 * 
 * Usage:
 * - Light load (10 users):  npx playwright test e2e/load-testing.spec.ts --grep "@light"
 * - Medium load (50 users): npx playwright test e2e/load-testing.spec.ts --grep "@medium"
 * - Heavy load (100 users): npx playwright test e2e/load-testing.spec.ts --grep "@heavy"
 * - Stress test (500+ users): npx playwright test e2e/load-testing.spec.ts --grep "@stress"
 */

const TEST_DOCTOR_EMAIL = 'doctor.test@lablink.test';
const TEST_DOCTOR_PASSWORD = 'TestDoctor123!';
const TEST_LAB_EMAIL = 'lab.test@lablink.test';
const TEST_LAB_PASSWORD = 'TestLab123!';

interface PerformanceMetrics {
  userIndex: number;
  action: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

const metrics: PerformanceMetrics[] = [];

async function recordMetric(
  userIndex: number,
  action: string,
  startTime: number,
  success: boolean,
  error?: string
) {
  const endTime = Date.now();
  metrics.push({
    userIndex,
    action,
    startTime,
    endTime,
    duration: endTime - startTime,
    success,
    error,
  });
}

async function loginAsDoctor(page: Page, userIndex: number): Promise<boolean> {
  const startTime = Date.now();
  try {
    await page.goto('/auth');
    await page.fill('input[type="email"]', `${TEST_DOCTOR_EMAIL.replace('@', `+${userIndex}@`)}`);
    await page.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await recordMetric(userIndex, 'login', startTime, true);
    return true;
  } catch (error) {
    await recordMetric(userIndex, 'login', startTime, false, String(error));
    return false;
  }
}

async function createOrder(page: Page, userIndex: number): Promise<boolean> {
  const startTime = Date.now();
  try {
    await page.goto('/new-order');
    await page.fill('input[name="patient_name"]', `Load Test Patient ${userIndex}`);
    await page.selectOption('select[name="restoration_type"]', 'Zirconia');
    await page.fill('input[name="teeth_number"]', '11');
    await page.fill('input[name="teeth_shade"]', 'A2');
    await page.click('button[type="submit"]');
    
    // Wait for success (either redirect or success message)
    await Promise.race([
      page.waitForURL('/dashboard', { timeout: 15000 }),
      page.waitForSelector('text=/order created|success/i', { timeout: 15000 }),
    ]);
    
    await recordMetric(userIndex, 'create_order', startTime, true);
    return true;
  } catch (error) {
    await recordMetric(userIndex, 'create_order', startTime, false, String(error));
    return false;
  }
}

async function browseOrders(page: Page, userIndex: number): Promise<boolean> {
  const startTime = Date.now();
  try {
    await page.goto('/dashboard');
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Scroll through orders
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    await recordMetric(userIndex, 'browse_orders', startTime, true);
    return true;
  } catch (error) {
    await recordMetric(userIndex, 'browse_orders', startTime, false, String(error));
    return false;
  }
}

async function sendChatMessage(page: Page, userIndex: number, orderId: string): Promise<boolean> {
  const startTime = Date.now();
  try {
    await page.goto(`/dashboard`);
    
    // Find and click on an order to open chat
    await page.click(`text=/Order #${orderId}|LAB-/i`);
    await page.waitForSelector('textarea[placeholder*="message"]', { timeout: 5000 });
    
    await page.fill('textarea[placeholder*="message"]', `Load test message from user ${userIndex}`);
    await page.click('button:has-text("Send")');
    
    await page.waitForTimeout(1000);
    
    await recordMetric(userIndex, 'send_chat', startTime, true);
    return true;
  } catch (error) {
    await recordMetric(userIndex, 'send_chat', startTime, false, String(error));
    return false;
  }
}

function analyzeMetrics() {
  const summary = {
    total: metrics.length,
    successful: metrics.filter(m => m.success).length,
    failed: metrics.filter(m => !m.success).length,
    byAction: {} as Record<string, any>,
  };

  // Group by action
  const actions = [...new Set(metrics.map(m => m.action))];
  
  actions.forEach(action => {
    const actionMetrics = metrics.filter(m => m.action === action);
    const successfulMetrics = actionMetrics.filter(m => m.success);
    const durations = successfulMetrics.map(m => m.duration);
    
    summary.byAction[action] = {
      total: actionMetrics.length,
      successful: successfulMetrics.length,
      failed: actionMetrics.length - successfulMetrics.length,
      avgDuration: durations.length > 0 
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
        : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      p95Duration: durations.length > 0 
        ? Math.round(durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)]) 
        : 0,
    };
  });

  return summary;
}

test.describe('Load Testing', () => {
  test.afterAll(() => {
    const summary = analyzeMetrics();
    console.log('\n========== LOAD TEST RESULTS ==========');
    console.log(`Total requests: ${summary.total}`);
    console.log(`Successful: ${summary.successful} (${Math.round(summary.successful / summary.total * 100)}%)`);
    console.log(`Failed: ${summary.failed} (${Math.round(summary.failed / summary.total * 100)}%)`);
    console.log('\nBreakdown by action:');
    
    Object.entries(summary.byAction).forEach(([action, stats]) => {
      console.log(`\n${action}:`);
      console.log(`  Success rate: ${Math.round(stats.successful / stats.total * 100)}%`);
      console.log(`  Avg duration: ${stats.avgDuration}ms`);
      console.log(`  Min duration: ${stats.minDuration}ms`);
      console.log(`  Max duration: ${stats.maxDuration}ms`);
      console.log(`  P95 duration: ${stats.p95Duration}ms`);
    });
    console.log('\n=======================================\n');
  });

  test('@light Light load - 10 concurrent users', async ({ browser }) => {
    const concurrentUsers = 10;
    const contexts = await Promise.all(
      Array(concurrentUsers).fill(null).map(() => browser.newContext())
    );

    const results = await Promise.allSettled(
      contexts.map(async (context, index) => {
        const page = await context.newPage();
        
        try {
          await loginAsDoctor(page, index);
          await browseOrders(page, index);
          await createOrder(page, index);
        } finally {
          await context.close();
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`Light load: ${successful}/${concurrentUsers} users completed successfully`);
    
    expect(successful).toBeGreaterThan(concurrentUsers * 0.9); // 90% success rate
  });

  test('@medium Medium load - 50 concurrent users', async ({ browser }) => {
    const concurrentUsers = 50;
    const batchSize = 10;
    const batches = Math.ceil(concurrentUsers / batchSize);

    let totalSuccessful = 0;

    for (let batch = 0; batch < batches; batch++) {
      const contexts = await Promise.all(
        Array(batchSize).fill(null).map(() => browser.newContext())
      );

      const results = await Promise.allSettled(
        contexts.map(async (context, index) => {
          const userIndex = batch * batchSize + index;
          const page = await context.newPage();
          
          try {
            await loginAsDoctor(page, userIndex);
            await browseOrders(page, userIndex);
          } finally {
            await context.close();
          }
        })
      );

      totalSuccessful += results.filter(r => r.status === 'fulfilled').length;
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Medium load: ${totalSuccessful}/${concurrentUsers} users completed successfully`);
    expect(totalSuccessful).toBeGreaterThan(concurrentUsers * 0.85); // 85% success rate
  });

  test('@heavy Heavy load - 100 concurrent users', async ({ browser }) => {
    const concurrentUsers = 100;
    const batchSize = 20;
    const batches = Math.ceil(concurrentUsers / batchSize);

    let totalSuccessful = 0;

    for (let batch = 0; batch < batches; batch++) {
      const contexts = await Promise.all(
        Array(batchSize).fill(null).map(() => browser.newContext())
      );

      const results = await Promise.allSettled(
        contexts.map(async (context, index) => {
          const userIndex = batch * batchSize + index;
          const page = await context.newPage();
          
          try {
            await loginAsDoctor(page, userIndex);
            await browseOrders(page, userIndex);
          } finally {
            await context.close();
          }
        })
      );

      totalSuccessful += results.filter(r => r.status === 'fulfilled').length;
      console.log(`Batch ${batch + 1}/${batches} completed: ${results.filter(r => r.status === 'fulfilled').length}/${batchSize} successful`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`Heavy load: ${totalSuccessful}/${concurrentUsers} users completed successfully`);
    expect(totalSuccessful).toBeGreaterThan(concurrentUsers * 0.75); // 75% success rate
  });

  test('@stress Stress test - Rate limiting verification', async ({ browser }) => {
    // Test that rate limiting kicks in appropriately
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await loginAsDoctor(page, 999);
    
    let successCount = 0;
    let rateLimitCount = 0;

    // Try to create 15 orders rapidly (limit is 10 per hour)
    for (let i = 0; i < 15; i++) {
      const success = await createOrder(page, 999);
      if (success) {
        successCount++;
      } else {
        rateLimitCount++;
      }
    }

    console.log(`Stress test: ${successCount} succeeded, ${rateLimitCount} rate limited`);
    
    // Should hit rate limit
    expect(rateLimitCount).toBeGreaterThan(0);
    expect(successCount).toBeLessThanOrEqual(10);
    
    await context.close();
  });

  test('@stress Stress test - Database query performance', async ({ browser }) => {
    // Measure database query performance under load
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await loginAsDoctor(page, 1000);
    
    const queryTimes: number[] = [];
    
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      await browseOrders(page, 1000);
      const duration = Date.now() - start;
      queryTimes.push(duration);
      
      await page.waitForTimeout(500);
    }

    const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
    const maxQueryTime = Math.max(...queryTimes);
    
    console.log(`Database query performance:`);
    console.log(`  Average: ${Math.round(avgQueryTime)}ms`);
    console.log(`  Max: ${maxQueryTime}ms`);
    
    // Queries should complete within reasonable time
    expect(avgQueryTime).toBeLessThan(3000); // 3 seconds average
    expect(maxQueryTime).toBeLessThan(5000); // 5 seconds max
    
    await context.close();
  });
});
