import { test, expect } from '@playwright/test';

const TEST_DOCTOR_EMAIL = 'doctor.test@lablink.test';
const TEST_DOCTOR_PASSWORD = 'TestDoctor123!';
const TEST_LAB_EMAIL = 'lab.test@lablink.test';
const TEST_LAB_PASSWORD = 'TestLab123!';

test.describe('Complete Order Workflow', () => {
  let orderId: string;

  test('should complete full order lifecycle: creation → marketplace → acceptance → production → delivery', async ({ browser }) => {
    // Step 1: Doctor creates order
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    await doctorPage.waitForURL('/dashboard');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Full Workflow Patient');
    await doctorPage.selectOption('select[name="restoration_type"]', 'Zirconia');
    await doctorPage.fill('input[name="teeth_number"]', '26');
    await doctorPage.fill('input[name="teeth_shade"]', 'A2');
    await doctorPage.click('button[type="submit"]');
    await doctorPage.waitForURL('/dashboard');
    
    // Step 2: Lab staff views marketplace and applies
    const labContext = await browser.newContext();
    const labPage = await labContext.newPage();
    
    await labPage.goto('/auth');
    await labPage.fill('input[type="email"]', TEST_LAB_EMAIL);
    await labPage.fill('input[type="password"]', TEST_LAB_PASSWORD);
    await labPage.click('button[type="submit"]');
    await labPage.waitForURL('/dashboard');
    
    await labPage.goto('/orders-marketplace');
    await expect(labPage.locator('text=Full Workflow Patient')).toBeVisible();
    
    // Apply for the order
    await labPage.click('button:has-text("Apply for Order")');
    await expect(labPage.locator('text=/application submitted/i')).toBeVisible();
    
    // Step 3: Doctor accepts lab application
    await doctorPage.goto('/lab-requests-management');
    await expect(doctorPage.locator('text=Full Workflow Patient')).toBeVisible();
    
    await doctorPage.click('button:has-text("Accept")');
    
    // Verify acceptance animation appears
    await expect(doctorPage.locator('text=/accepted/i')).toBeVisible({ timeout: 3000 });
    
    // Step 4: Lab updates order status through production
    await labPage.goto('/dashboard');
    await labPage.click('text=Full Workflow Patient');
    
    // Update to In Progress
    await labPage.click('button:has-text("Update Status")');
    await labPage.selectOption('select[name="status"]', 'In Progress');
    await labPage.click('button:has-text("Save")');
    await expect(labPage.locator('text=In Progress')).toBeVisible();
    
    // Update to Ready for QC
    await labPage.click('button:has-text("Update Status")');
    await labPage.selectOption('select[name="status"]', 'Ready for QC');
    await labPage.click('button:has-text("Save")');
    await expect(labPage.locator('text=Ready for QC')).toBeVisible();
    
    // Update to Ready for Delivery
    await labPage.click('button:has-text("Update Status")');
    await labPage.selectOption('select[name="status"]', 'Ready for Delivery');
    await labPage.click('button:has-text("Save")');
    await expect(labPage.locator('text=Ready for Delivery')).toBeVisible();
    
    // Step 5: Mark as Delivered
    await labPage.click('button:has-text("Update Status")');
    await labPage.selectOption('select[name="status"]', 'Delivered');
    await labPage.fill('input[name="actual_delivery_date"]', '2024-12-01');
    await labPage.click('button:has-text("Save")');
    await expect(labPage.locator('text=Delivered')).toBeVisible();
    
    // Step 6: Doctor verifies completion
    await doctorPage.goto('/dashboard');
    await doctorPage.click('text=Full Workflow Patient');
    await expect(doctorPage.locator('text=Delivered')).toBeVisible();
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should handle lab rejection workflow', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    await doctorPage.waitForURL('/dashboard');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Rejection Test Patient');
    await doctorPage.selectOption('select[name="restoration_type"]', 'E-max');
    await doctorPage.fill('input[name="teeth_number"]', '11');
    await doctorPage.fill('input[name="teeth_shade"]', 'B1');
    await doctorPage.click('button[type="submit"]');
    await doctorPage.waitForURL('/dashboard');
    
    const labContext = await browser.newContext();
    const labPage = await labContext.newPage();
    
    await labPage.goto('/auth');
    await labPage.fill('input[type="email"]', TEST_LAB_EMAIL);
    await labPage.fill('input[type="password"]', TEST_LAB_PASSWORD);
    await labPage.click('button[type="submit"]');
    await labPage.waitForURL('/dashboard');
    
    await labPage.goto('/orders-marketplace');
    await labPage.click('button:has-text("Apply for Order")');
    
    // Doctor declines the application
    await doctorPage.goto('/lab-requests-management');
    await doctorPage.click('button:has-text("Decline")');
    await expect(doctorPage.locator('text=/declined/i')).toBeVisible();
    
    // Lab should not be able to reapply
    await labPage.goto('/orders-marketplace');
    const applyButton = labPage.locator('button:has-text("Apply for Order")');
    await expect(applyButton).toBeDisabled();
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should track order status history', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    await doctorPage.waitForURL('/dashboard');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'History Test Patient');
    await doctorPage.selectOption('select[name="restoration_type"]', 'PFM');
    await doctorPage.fill('input[name="teeth_number"]', '46');
    await doctorPage.fill('input[name="teeth_shade"]', 'A3');
    await doctorPage.click('button[type="submit"]');
    await doctorPage.waitForURL('/dashboard');
    
    const labContext = await browser.newContext();
    const labPage = await labContext.newPage();
    
    await labPage.goto('/auth');
    await labPage.fill('input[type="email"]', TEST_LAB_EMAIL);
    await labPage.fill('input[type="password"]', TEST_LAB_PASSWORD);
    await labPage.click('button[type="submit"]');
    
    await labPage.goto('/orders-marketplace');
    await labPage.click('button:has-text("Apply for Order")');
    
    await doctorPage.goto('/lab-requests-management');
    await doctorPage.click('button:has-text("Accept")');
    
    await labPage.goto('/dashboard');
    await labPage.click('text=History Test Patient');
    
    // View order history
    await labPage.click('button:has-text("View History")');
    await expect(labPage.locator('text=Pending')).toBeVisible();
    
    await doctorContext.close();
    await labContext.close();
  });
});
