import { test, expect } from '@playwright/test';

const TEST_DOCTOR_EMAIL = 'doctor.test@lablink.test';
const TEST_DOCTOR_PASSWORD = 'TestDoctor123!';
const TEST_LAB_EMAIL = 'lab.test@lablink.test';
const TEST_LAB_PASSWORD = 'TestLab123!';

test.describe('Error Cases and Validation', () => {
  test('should prevent unauthorized access to order creation', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_LAB_EMAIL);
    await page.fill('input[type="password"]', TEST_LAB_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Lab staff should not access order creation
    await page.goto('/new-order');
    
    await expect(page.locator('text=/access denied/i')).toBeVisible({ timeout: 5000 });
  });

  test('should prevent duplicate lab applications', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Duplicate Application Test');
    await doctorPage.selectOption('select[name="restoration_type"]', 'Zirconia');
    await doctorPage.fill('input[name="teeth_number"]', '26');
    await doctorPage.fill('input[name="teeth_shade"]', 'A2');
    await doctorPage.click('button[type="submit"]');
    
    const labContext = await browser.newContext();
    const labPage = await labContext.newPage();
    
    await labPage.goto('/auth');
    await labPage.fill('input[type="email"]', TEST_LAB_EMAIL);
    await labPage.fill('input[type="password"]', TEST_LAB_PASSWORD);
    await labPage.click('button[type="submit"]');
    
    await labPage.goto('/orders-marketplace');
    
    // First application
    await labPage.click('button:has-text("Apply for Order")');
    await expect(labPage.locator('text=/application submitted/i')).toBeVisible();
    
    // Try to apply again - should be disabled
    const applyButton = labPage.locator('button:has-text("Apply for Order")');
    await expect(applyButton).toBeDisabled();
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should validate order form fields', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await page.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto('/new-order');
    
    // Try submitting empty form
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/required/i').first()).toBeVisible();
    
    // Invalid teeth number format
    await page.fill('input[name="patient_name"]', 'Test Patient');
    await page.selectOption('select[name="restoration_type"]', 'Zirconia');
    await page.fill('input[name="teeth_number"]', 'invalid');
    await page.fill('input[name="teeth_shade"]', 'A2');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/invalid/i')).toBeVisible();
  });

  test('should prevent lab from viewing orders they are not assigned to', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    
    // Create order but don't assign to lab
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Unauthorized Access Test');
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
    
    // Lab should only see marketplace orders, not assigned orders
    await labPage.goto('/dashboard');
    
    // Should only see marketplace view, not unassigned orders
    await expect(labPage.locator('text=Unauthorized Access Test')).not.toBeVisible();
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should handle file upload size validation', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    
    const labContext = await browser.newContext();
    const labPage = await labContext.newPage();
    
    await labPage.goto('/auth');
    await labPage.fill('input[type="email"]', TEST_LAB_EMAIL);
    await labPage.fill('input[type="password"]', TEST_LAB_PASSWORD);
    await labPage.click('button[type="submit"]');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'File Size Test');
    await doctorPage.selectOption('select[name="restoration_type"]', 'PFM');
    await doctorPage.fill('input[name="teeth_number"]', '46');
    await doctorPage.fill('input[name="teeth_shade"]', 'A3');
    await doctorPage.click('button[type="submit"]');
    
    await labPage.goto('/orders-marketplace');
    await labPage.click('button:has-text("Apply for Order")');
    
    await doctorPage.goto('/lab-requests-management');
    await doctorPage.click('button:has-text("Accept")');
    
    // Try to upload file larger than 10MB
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    const fileInput = doctorPage.locator('input[type="file"]');
    
    await fileInput.setInputFiles({
      name: 'large-file.pdf',
      mimeType: 'application/pdf',
      buffer: largeBuffer
    });
    
    // Should show error
    await expect(doctorPage.locator('text=/file too large/i')).toBeVisible({ timeout: 3000 });
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should handle invalid file types in chat', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    
    const labContext = await browser.newContext();
    const labPage = await labContext.newPage();
    
    await labPage.goto('/auth');
    await labPage.fill('input[type="email"]', TEST_LAB_EMAIL);
    await labPage.fill('input[type="password"]', TEST_LAB_PASSWORD);
    await labPage.click('button[type="submit"]');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Invalid File Type Test');
    await doctorPage.selectOption('select[name="restoration_type"]', 'Zirconia');
    await doctorPage.fill('input[name="teeth_number"]', '16');
    await doctorPage.fill('input[name="teeth_shade"]', 'A1');
    await doctorPage.click('button[type="submit"]');
    
    await labPage.goto('/orders-marketplace');
    await labPage.click('button:has-text("Apply for Order")');
    
    await doctorPage.goto('/lab-requests-management');
    await doctorPage.click('button:has-text("Accept")');
    
    // Try to upload executable file
    const fileInput = doctorPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'malicious.exe',
      mimeType: 'application/x-msdownload',
      buffer: Buffer.from('fake-exe-data')
    });
    
    // Should show error
    await expect(doctorPage.locator('text=/invalid file type/i')).toBeVisible({ timeout: 3000 });
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await page.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Simulate offline
    await context.setOffline(true);
    
    await page.goto('/new-order');
    await page.fill('input[name="patient_name"]', 'Network Error Test');
    await page.selectOption('select[name="restoration_type"]', 'E-max');
    await page.fill('input[name="teeth_number"]', '21');
    await page.fill('input[name="teeth_shade"]', 'B1');
    await page.click('button[type="submit"]');
    
    // Should show network error
    await expect(page.locator('text=/network error|failed to submit/i')).toBeVisible({ timeout: 5000 });
    
    await context.setOffline(false);
  });

  test('should prevent status updates by unauthorized users', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Unauthorized Status Update');
    await doctorPage.selectOption('select[name="restoration_type"]', 'PFM');
    await doctorPage.fill('input[name="teeth_number"]', '36');
    await doctorPage.fill('input[name="teeth_shade"]', 'A3');
    await doctorPage.click('button[type="submit"]');
    
    // Doctor should not be able to update status without lab assignment
    await doctorPage.goto('/dashboard');
    await doctorPage.click('text=Unauthorized Status Update');
    
    // Status update button should not be visible or should be disabled
    const statusButton = doctorPage.locator('button:has-text("Update Status")');
    await expect(statusButton).not.toBeVisible();
    
    await doctorContext.close();
  });

  test('should validate chat message length', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    
    const labContext = await browser.newContext();
    const labPage = await labContext.newPage();
    
    await labPage.goto('/auth');
    await labPage.fill('input[type="email"]', TEST_LAB_EMAIL);
    await labPage.fill('input[type="password"]', TEST_LAB_PASSWORD);
    await labPage.click('button[type="submit"]');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Message Length Test');
    await doctorPage.selectOption('select[name="restoration_type"]', 'Zirconia');
    await doctorPage.fill('input[name="teeth_number"]', '11');
    await doctorPage.fill('input[name="teeth_shade"]', 'A2');
    await doctorPage.click('button[type="submit"]');
    
    await labPage.goto('/orders-marketplace');
    await labPage.click('button:has-text("Apply for Order")');
    
    await doctorPage.goto('/lab-requests-management');
    await doctorPage.click('button:has-text("Accept")');
    
    // Try to send empty message
    await doctorPage.click('button:has-text("Send")');
    
    // Send button should be disabled or show error
    const sendButton = doctorPage.locator('button:has-text("Send")');
    await expect(sendButton).toBeDisabled();
    
    await doctorContext.close();
    await labContext.close();
  });
});
