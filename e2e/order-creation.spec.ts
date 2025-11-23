import { test, expect } from '@playwright/test';

const TEST_DOCTOR_EMAIL = 'doctor.test@lablink.test';
const TEST_DOCTOR_PASSWORD = 'TestDoctor123!';

test.describe('Order Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as doctor
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await page.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should create order with all required fields', async ({ page }) => {
    await page.goto('/new-order');
    
    // Fill order form
    await page.fill('input[name="patient_name"]', 'John Doe');
    await page.selectOption('select[name="restoration_type"]', 'Zirconia');
    await page.fill('input[name="teeth_number"]', '14, 15');
    await page.fill('input[name="teeth_shade"]', 'A2');
    await page.selectOption('select[name="urgency"]', 'Normal');
    await page.fill('textarea[name="biological_notes"]', 'Patient has sensitive gums');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 });
    
    // Verify order appears in dashboard
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should create urgent order', async ({ page }) => {
    await page.goto('/new-order');
    
    await page.fill('input[name="patient_name"]', 'Jane Smith');
    await page.selectOption('select[name="restoration_type"]', 'E-max');
    await page.fill('input[name="teeth_number"]', '11');
    await page.fill('input[name="teeth_shade"]', 'B1');
    await page.selectOption('select[name="urgency"]', 'Urgent');
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    await expect(page.locator('text=Urgent')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/new-order');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=/required/i').first()).toBeVisible();
  });

  test('should create auto-assign order without lab selection', async ({ page }) => {
    await page.goto('/new-order');
    
    await page.fill('input[name="patient_name"]', 'Auto Assign Patient');
    await page.selectOption('select[name="restoration_type"]', 'PFM');
    await page.fill('input[name="teeth_number"]', '36');
    await page.fill('input[name="teeth_shade"]', 'A3');
    
    // Don't select a lab - should trigger auto-assign
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');
    
    // Verify order is in marketplace
    await page.goto('/orders-marketplace');
    await expect(page.locator('text=Auto Assign Patient')).toBeVisible();
  });

  test('should create order with multiple teeth', async ({ page }) => {
    await page.goto('/new-order');
    
    await page.fill('input[name="patient_name"]', 'Multi Tooth Patient');
    await page.selectOption('select[name="restoration_type"]', 'Bridge');
    await page.fill('input[name="teeth_number"]', '11, 12, 13, 21, 22, 23');
    await page.fill('input[name="teeth_shade"]', 'A1');
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');
    await expect(page.locator('text=Multi Tooth Patient')).toBeVisible();
  });

  test('should create order with different shade systems', async ({ page }) => {
    await page.goto('/new-order');
    
    await page.fill('input[name="patient_name"]', 'Shade System Patient');
    await page.selectOption('select[name="restoration_type"]', 'Zirconia');
    await page.fill('input[name="teeth_number"]', '16');
    
    // Select VITA 3D-Master shade system
    await page.selectOption('select[name="shade_system"]', 'VITA 3D-Master');
    await page.fill('input[name="teeth_shade"]', '2M2');
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');
    await expect(page.locator('text=Shade System Patient')).toBeVisible();
  });
});
