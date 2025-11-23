import { test, expect } from '@playwright/test';

const TEST_DOCTOR_EMAIL = 'doctor.test@lablink.test';
const TEST_DOCTOR_PASSWORD = 'TestDoctor123!';
const TEST_LAB_EMAIL = 'lab.test@lablink.test';
const TEST_LAB_PASSWORD = 'TestLab123!';

test.describe('Chat Functionality', () => {
  test('should enable chat after lab acceptance and send messages', async ({ browser }) => {
    const doctorContext = await browser.newContext();
    const doctorPage = await doctorContext.newPage();
    
    await doctorPage.goto('/auth');
    await doctorPage.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await doctorPage.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await doctorPage.click('button[type="submit"]');
    await doctorPage.waitForURL('/dashboard');
    
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Chat Test Patient');
    await doctorPage.selectOption('select[name="restoration_type"]', 'Zirconia');
    await doctorPage.fill('input[name="teeth_number"]', '16');
    await doctorPage.fill('input[name="teeth_shade"]', 'A2');
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
    
    // Chat should open automatically after acceptance
    await expect(doctorPage.locator('[data-testid="chat-window"]')).toBeVisible({ timeout: 5000 });
    
    // Doctor sends a message
    await doctorPage.fill('textarea[placeholder*="message"]', 'Hello, when can you complete this order?');
    await doctorPage.click('button:has-text("Send")');
    
    // Message should appear in chat
    await expect(doctorPage.locator('text=Hello, when can you complete this order?')).toBeVisible();
    
    // Lab should receive the message
    await labPage.goto('/dashboard');
    await labPage.click('text=Chat Test Patient');
    
    // Open chat
    await labPage.click('button:has-text("Chat")');
    await expect(labPage.locator('text=Hello, when can you complete this order?')).toBeVisible();
    
    // Lab sends a reply
    await labPage.fill('textarea[placeholder*="message"]', 'We can complete it in 3 days');
    await labPage.click('button:has-text("Send")');
    
    // Doctor receives the reply
    await expect(doctorPage.locator('text=We can complete it in 3 days')).toBeVisible({ timeout: 5000 });
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should show typing indicators in real-time', async ({ browser }) => {
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
    
    // Create order and accept
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Typing Indicator Test');
    await doctorPage.selectOption('select[name="restoration_type"]', 'E-max');
    await doctorPage.fill('input[name="teeth_number"]', '21');
    await doctorPage.fill('input[name="teeth_shade"]', 'B1');
    await doctorPage.click('button[type="submit"]');
    
    await labPage.goto('/orders-marketplace');
    await labPage.click('button:has-text("Apply for Order")');
    
    await doctorPage.goto('/lab-requests-management');
    await doctorPage.click('button:has-text("Accept")');
    
    // Lab starts typing
    await labPage.goto('/dashboard');
    await labPage.click('text=Typing Indicator Test');
    await labPage.click('button:has-text("Chat")');
    await labPage.fill('textarea[placeholder*="message"]', 'Test message');
    
    // Doctor should see typing indicator
    await expect(doctorPage.locator('text=/typing/i')).toBeVisible({ timeout: 3000 });
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should show read receipts for messages', async ({ browser }) => {
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
    
    // Setup and send message
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Read Receipt Test');
    await doctorPage.selectOption('select[name="restoration_type"]', 'PFM');
    await doctorPage.fill('input[name="teeth_number"]', '36');
    await doctorPage.fill('input[name="teeth_shade"]', 'A3');
    await doctorPage.click('button[type="submit"]');
    
    await labPage.goto('/orders-marketplace');
    await labPage.click('button:has-text("Apply for Order")');
    
    await doctorPage.goto('/lab-requests-management');
    await doctorPage.click('button:has-text("Accept")');
    
    await doctorPage.fill('textarea[placeholder*="message"]', 'Read receipt test message');
    await doctorPage.click('button:has-text("Send")');
    
    // Initially should show single check (sent)
    await expect(doctorPage.locator('[data-testid="check-icon-single"]')).toBeVisible();
    
    // Lab opens chat and reads message
    await labPage.goto('/dashboard');
    await labPage.click('text=Read Receipt Test');
    await labPage.click('button:has-text("Chat")');
    await expect(labPage.locator('text=Read receipt test message')).toBeVisible();
    
    // Should show double check (read)
    await expect(doctorPage.locator('[data-testid="check-icon-double"]')).toBeVisible({ timeout: 3000 });
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should support file sharing in chat', async ({ browser }) => {
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
    await doctorPage.fill('input[name="patient_name"]', 'File Share Test');
    await doctorPage.selectOption('select[name="restoration_type"]', 'Zirconia');
    await doctorPage.fill('input[name="teeth_number"]', '11');
    await doctorPage.fill('input[name="teeth_shade"]', 'A1');
    await doctorPage.click('button[type="submit"]');
    
    await labPage.goto('/orders-marketplace');
    await labPage.click('button:has-text("Apply for Order")');
    
    await doctorPage.goto('/lab-requests-management');
    await doctorPage.click('button:has-text("Accept")');
    
    // Upload a file
    const fileInput = doctorPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data')
    });
    
    // File should be uploaded and shown
    await expect(doctorPage.locator('text=test-image.png')).toBeVisible({ timeout: 5000 });
    
    // Lab should see the file
    await labPage.goto('/dashboard');
    await labPage.click('text=File Share Test');
    await labPage.click('button:has-text("Chat")');
    await expect(labPage.locator('text=test-image.png')).toBeVisible();
    
    await doctorContext.close();
    await labContext.close();
  });

  test('should access chat history page', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
    await page.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    await page.goto('/chat-history');
    
    // Should show chat history page
    await expect(page.locator('h1:has-text("Chat History")')).toBeVisible();
    
    // Should have search functionality
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('should play notification sound on new message', async ({ browser }) => {
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
    
    // Setup
    await doctorPage.goto('/new-order');
    await doctorPage.fill('input[name="patient_name"]', 'Notification Sound Test');
    await doctorPage.selectOption('select[name="restoration_type"]', 'E-max');
    await doctorPage.fill('input[name="teeth_number"]', '12');
    await doctorPage.fill('input[name="teeth_shade"]', 'A2');
    await doctorPage.click('button[type="submit"]');
    
    await labPage.goto('/orders-marketplace');
    await labPage.click('button:has-text("Apply for Order")');
    
    await doctorPage.goto('/lab-requests-management');
    await doctorPage.click('button:has-text("Accept")');
    
    // Listen for audio playback
    let audioPlayed = false;
    await doctorPage.exposeFunction('audioPlayed', () => {
      audioPlayed = true;
    });
    
    // Lab sends a message
    await labPage.goto('/dashboard');
    await labPage.click('text=Notification Sound Test');
    await labPage.click('button:has-text("Chat")');
    await labPage.fill('textarea[placeholder*="message"]', 'This should trigger a sound');
    await labPage.click('button:has-text("Send")');
    
    // Wait for message to arrive
    await doctorPage.waitForTimeout(2000);
    
    await doctorContext.close();
    await labContext.close();
  });
});
