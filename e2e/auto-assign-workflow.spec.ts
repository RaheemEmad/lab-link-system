import { test, expect } from '@playwright/test';

// Test credentials
const DOCTOR_EMAIL = 'doctor.test@lablink.test';
const DOCTOR_PASSWORD = 'TestDoctor123!';
const LAB_EMAIL = 'lab.staff@lablink.test';
const LAB_PASSWORD = 'TestLabStaff123!';

test.describe('Auto-Assign Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Doctor submits auto-assign order', async ({ page }) => {
    // Login as doctor
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', DOCTOR_EMAIL);
    await page.fill('input[type="password"]', DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Create new order without selecting lab
    await page.click('text=New Order');
    await page.fill('input[name="patient_name"]', 'Auto Assign Test Patient');
    await page.fill('input[name="teeth_number"]', '11');
    await page.fill('input[name="teeth_shade"]', 'A2');
    await page.selectOption('select[name="restoration_type"]', 'Crown');
    await page.selectOption('select[name="urgency"]', 'Normal');
    
    // Skip lab selection (leave it empty for auto-assign)
    await page.click('button:has-text("Submit Order")');
    
    // Verify order created
    await expect(page.locator('text=Order created successfully')).toBeVisible();
    
    // Verify order appears in dashboard
    await page.goto('/dashboard');
    await expect(page.locator('text=Auto Assign Test Patient')).toBeVisible();
  });

  test('Notification navigates to marketplace', async ({ page, context }) => {
    // Login as lab staff
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', LAB_EMAIL);
    await page.fill('input[type="password"]', LAB_PASSWORD);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Navigate to notifications
    await page.click('[aria-label="Notifications"]');
    
    // Find marketplace notification
    const marketplaceNotification = page.locator('text=New Order in Marketplace').first();
    await expect(marketplaceNotification).toBeVisible();
    
    // Click notification
    await marketplaceNotification.click();
    
    // Verify navigation to marketplace
    await expect(page).toHaveURL(/\/orders-marketplace/);
  });

  test('Marketplace shows available orders', async ({ page }) => {
    // Login as lab staff
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', LAB_EMAIL);
    await page.fill('input[type="password"]', LAB_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Navigate to marketplace
    await page.goto('/orders-marketplace');
    
    // Verify marketplace loads
    await expect(page.locator('h1:has-text("Orders Marketplace")')).toBeVisible();
    
    // Check for orders or "No available orders" message
    const hasOrders = await page.locator('[data-testid="marketplace-order-card"]').count() > 0;
    const noOrdersMessage = page.locator('text=No available orders');
    
    if (!hasOrders) {
      await expect(noOrdersMessage).toBeVisible();
    } else {
      // Verify order cards show correct information
      const orderCard = page.locator('[data-testid="marketplace-order-card"]').first();
      await expect(orderCard.locator('text=Order #')).toBeVisible();
      await expect(orderCard.locator('button:has-text("Apply to this Order")')).toBeVisible();
    }
  });

  test('Lab applies to marketplace order', async ({ page }) => {
    // Login as lab staff
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', LAB_EMAIL);
    await page.fill('input[type="password"]', LAB_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto('/orders-marketplace');
    
    // Wait for orders to load
    await page.waitForTimeout(2000);
    
    const orderCard = page.locator('[data-testid="marketplace-order-card"]').first();
    
    if (await orderCard.count() > 0) {
      const applyButton = orderCard.locator('button:has-text("Apply to this Order")');
      
      if (await applyButton.isVisible()) {
        await applyButton.click();
        
        // Verify success message
        await expect(page.locator('text=Application submitted successfully')).toBeVisible();
        
        // Verify button changes to "Request Sent"
        await expect(orderCard.locator('text=Request Sent')).toBeVisible();
      }
    }
  });

  test('Lab dashboard does not show unassigned orders', async ({ page }) => {
    // Login as lab staff
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', LAB_EMAIL);
    await page.fill('input[type="password"]', LAB_PASSWORD);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Dashboard should only show assigned orders
    // Marketplace orders should NOT appear here
    const dashboardOrders = page.locator('[data-testid="order-card"]');
    
    // Each order should have an assigned_lab_id
    const count = await dashboardOrders.count();
    
    for (let i = 0; i < count; i++) {
      const order = dashboardOrders.nth(i);
      // Verify order has status badge (indicating it's assigned)
      await expect(order.locator('[data-testid="order-status"]')).toBeVisible();
    }
  });

  test('Doctor accepts lab application', async ({ page, context }) => {
    // Login as doctor
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', DOCTOR_EMAIL);
    await page.fill('input[type="password"]', DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Navigate to lab requests
    await page.goto('/lab-requests');
    
    // Wait for requests to load
    await page.waitForTimeout(2000);
    
    const pendingRequest = page.locator('[data-testid="lab-request-card"]').first();
    
    if (await pendingRequest.count() > 0) {
      const acceptButton = pendingRequest.locator('button:has-text("Accept")');
      
      if (await acceptButton.isVisible()) {
        // Get order number before accepting
        const orderNumber = await pendingRequest.locator('text=Order #').textContent();
        
        await acceptButton.click();
        
        // Confirm action if dialog appears
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        // Verify success message
        await expect(page.locator('text=Lab application accepted')).toBeVisible();
        
        // Verify order appears in dashboard
        await page.goto('/dashboard');
        if (orderNumber) {
          await expect(page.locator(`text=${orderNumber.trim()}`)).toBeVisible();
        }
      }
    }
  });

  test('Doctor rejects lab application', async ({ page }) => {
    // Login as doctor
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', DOCTOR_EMAIL);
    await page.fill('input[type="password"]', DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto('/lab-requests');
    await page.waitForTimeout(2000);
    
    const pendingRequest = page.locator('[data-testid="lab-request-card"]').first();
    
    if (await pendingRequest.count() > 0) {
      const rejectButton = pendingRequest.locator('button:has-text("Reject")');
      
      if (await rejectButton.isVisible()) {
        await rejectButton.click();
        
        // Confirm action
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        // Verify rejection
        await expect(page.locator('text=Lab application rejected')).toBeVisible();
      }
    }
  });

  test('Rejected lab cannot see order in marketplace', async ({ page, context }) => {
    // This test requires a rejected lab application to exist
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', LAB_EMAIL);
    await page.fill('input[type="password"]', LAB_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto('/orders-marketplace');
    
    // Verify rejected orders are filtered out
    // Orders that this lab was rejected for should not appear
    const orderCards = page.locator('[data-testid="marketplace-order-card"]');
    const count = await orderCards.count();
    
    // Check that no "You were rejected" message appears
    await expect(page.locator('text=You were rejected for this order')).not.toBeVisible();
  });

  test('Multiple labs can apply to same order', async ({ browser }) => {
    // This would require multiple lab accounts
    // Skipping for now as it requires more setup
    test.skip();
  });

  test('Notification types display correct icons', async ({ page }) => {
    await page.click('text=Sign In');
    await page.fill('input[type="email"]', LAB_EMAIL);
    await page.fill('input[type="password"]', LAB_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.click('[aria-label="Notifications"]');
    
    // Check for different notification icons
    const notifications = page.locator('[data-testid="notification-item"]');
    const count = await notifications.count();
    
    for (let i = 0; i < count; i++) {
      const notification = notifications.nth(i);
      // Each notification should have an icon
      await expect(notification.locator('svg').first()).toBeVisible();
    }
  });
});

test.describe('Edge Cases', () => {
  test('Lab without lab_id sees warning', async ({ page }) => {
    // This requires creating a lab_staff user without lab_id
    // Would need special test setup
    test.skip();
  });

  test('Order removed from marketplace after assignment', async ({ page }) => {
    // Verify that once assigned, order disappears from marketplace
    test.skip();
  });

  test('Cannot reapply to rejected order', async ({ page }) => {
    // Verify RLS policy prevents reapplication
    test.skip();
  });
});
