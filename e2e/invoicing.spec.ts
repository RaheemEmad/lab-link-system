import { test, expect } from '@playwright/test';

const TEST_DOCTOR_EMAIL = 'doctor.test@lablink.test';
const TEST_DOCTOR_PASSWORD = 'TestDoctor123!';
const TEST_LAB_EMAIL = 'lab.test@lablink.test';
const TEST_LAB_PASSWORD = 'TestLab123!';

test.describe('Invoicing and Pricing', () => {
  test('should allow lab to set price for order', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Pricing Test Patient');
    await doctorPage.selectOption('select[name="restoration_type"]', 'Zirconia');
    await doctorPage.fill('input[name="teeth_number"]', '16');
    await doctorPage.fill('input[name="teeth_shade"]', 'A2');
    await doctorPage.click('button[type="submit"]');
    
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
    
    // Lab sets price
    await labPage.goto('/dashboard');
    await labPage.click('text=Pricing Test Patient');
    await labPage.click('button:has-text("Set Price")');
    await labPage.fill('input[name="price"]', '500');
    await labPage.click('button:has-text("Save Price")');
    
    // Verify price is set
    await expect(labPage.locator('text=500')).toBeVisible();
    
    // Doctor should see the price
    await doctorPage.goto('/dashboard');
    await doctorPage.click('text=Pricing Test Patient');
    await expect(doctorPage.locator('text=500')).toBeVisible();
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should validate price is positive number', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Price Validation Test');
    await doctorPage.selectOption('select[name="restoration_type"]', 'E-max');
    await doctorPage.fill('input[name="teeth_number"]', '11');
    await doctorPage.fill('input[name="teeth_shade"]', 'B1');
    await doctorPage.click('button[type="submit"]');
    
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
    await labPage.click('text=Price Validation Test');
    await labPage.click('button:has-text("Set Price")');
    
    // Try negative price
    await labPage.fill('input[name="price"]', '-100');
    await labPage.click('button:has-text("Save Price")');
    await expect(labPage.locator('text=/invalid|must be positive/i')).toBeVisible();
    
    // Try zero price
    await labPage.fill('input[name="price"]', '0');
    await labPage.click('button:has-text("Save Price")');
    await expect(labPage.locator('text=/invalid|must be positive/i')).toBeVisible();
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should display total cost for multiple items', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    
    // Create order with multiple teeth
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Multi Item Invoice');
    await doctorPage.selectOption('select[name="restoration_type"]', 'Bridge');
    await doctorPage.fill('input[name="teeth_number"]', '11, 12, 13');
    await doctorPage.fill('input[name="teeth_shade"]', 'A2');
    await doctorPage.click('button[type="submit"]');
    
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
    await labPage.click('text=Multi Item Invoice');
    await labPage.click('button:has-text("Set Price")');
    await labPage.fill('input[name="price"]', '1500');
    await labPage.click('button:has-text("Save Price")');
    
    // Should show total cost
    await expect(labPage.locator('text=1500')).toBeVisible();
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should generate invoice after delivery', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Invoice Generation Test');
    await doctorPage.selectOption('select[name="restoration_type"]', 'PFM');
    await doctorPage.fill('input[name="teeth_number"]', '46');
    await doctorPage.fill('input[name="teeth_shade"]', 'A3');
    await doctorPage.click('button[type="submit"]');
    
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
    
    // Set price and complete delivery
    await labPage.goto('/dashboard');
    await labPage.click('text=Invoice Generation Test');
    await labPage.click('button:has-text("Set Price")');
    await labPage.fill('input[name="price"]', '750');
    await labPage.click('button:has-text("Save Price")');
    
    // Update status to delivered
    await labPage.click('button:has-text("Update Status")');
    await labPage.selectOption('select[name="status"]', 'Delivered');
    await labPage.fill('input[name="actual_delivery_date"]', '2024-12-01');
    await labPage.click('button:has-text("Save")');
    
    // Should show option to generate/view invoice
    await expect(labPage.locator('button:has-text("Generate Invoice")')).toBeVisible();
    
    await doctorContext.close();
    await labContext.close();
  });
});
