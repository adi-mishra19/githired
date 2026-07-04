import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow
 * Tests the complete user journey from signup to dashboard access
 */
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete signup flow', async ({ page }) => {
    // Navigate to signup page
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*signup/);
    
    // Fill signup form
    await page.fill('[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'SecurePassword123!');
    await page.fill('[name="confirmPassword"]', 'SecurePassword123!');
    await page.selectOption('[name="role"]', 'student');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show verification message
    await expect(page.locator('text=verify your email')).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should show validation errors for invalid inputs', async ({ page }) => {
    await page.goto('/signup');
    
    // Try to submit with invalid email
    await page.fill('[name="email"]', 'invalid-email');
    await page.fill('[name="password"]', '123');
    await page.click('button[type="submit"]');
    
    // Should show error messages
    await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
    await expect(page.locator('text=/password.*short/i')).toBeVisible();
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/login');
    
    // Click forgot password
    await page.click('text=Forgot Password');
    await expect(page).toHaveURL(/.*forgot-password/);
    
    // Enter email
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=/email.*sent/i')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Logout
    await page.click('[aria-label="User menu"]');
    await page.click('text=Logout');
    
    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('should maintain session on page reload', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Reload page
    await page.reload();
    
    // Should still be on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/signup');
    
    // Test weak password
    await page.fill('[name="password"]', '123');
    await page.blur('[name="password"]');
    await expect(page.locator('text=/weak/i')).toBeVisible();
    
    // Test medium password
    await page.fill('[name="password"]', 'password123');
    await page.blur('[name="password"]');
    await expect(page.locator('text=/medium/i')).toBeVisible();
    
    // Test strong password
    await page.fill('[name="password"]', 'SecureP@ssw0rd!');
    await page.blur('[name="password"]');
    await expect(page.locator('text=/strong/i')).toBeVisible();
  });
});

test.describe('Student Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student
    await page.goto('/login');
    await page.fill('[name="email"]', 'student@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should browse and apply to jobs', async ({ page }) => {
    // Navigate to jobs
    await page.click('text=Jobs');
    await expect(page).toHaveURL(/.*jobs/);
    
    // Search for jobs
    await page.fill('[placeholder*="Search"]', 'Software Engineer');
    await page.press('[placeholder*="Search"]', 'Enter');
    
    // View job details
    await page.click('.job-card:first-child');
    await expect(page.locator('text=Job Details')).toBeVisible();
    
    // Apply to job
    await page.click('text=Apply Now');
    await expect(page.locator('text=/application.*submitted/i')).toBeVisible();
  });

  test('should view application status', async ({ page }) => {
    // Navigate to applications
    await page.click('text=My Applications');
    await expect(page).toHaveURL(/.*applications/);
    
    // Should see list of applications
    await expect(page.locator('.application-item')).toHaveCount(expect.any(Number));
  });
});

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should open AI assistant modal', async ({ page }) => {
    // Click AI assistant button
    await page.click('[aria-label="AI Assistant"]');
    
    // Modal should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=AI Assistant')).toBeVisible();
  });

  test('should query data and show visualization', async ({ page }) => {
    // Open AI assistant
    await page.click('[aria-label="AI Assistant"]');
    
    // Enter query
    await page.fill('[placeholder*="Ask"]', 'How many applications do we have?');
    await page.click('text=Ask');
    
    // Should show loading state
    await expect(page.locator('text=/loading|processing/i')).toBeVisible();
    
    // Should show results
    await expect(page.locator('.visualization')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Should show mobile menu
    await expect(page.locator('[aria-label="Menu"]')).toBeVisible();
    
    // Open menu
    await page.click('[aria-label="Menu"]');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    
    // Should display properly
    await expect(page.locator('.sidebar')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check for h1
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form
    await page.keyboard.press('Tab');
    await expect(page.locator('[name="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[name="password"]')).toBeFocused();
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });
});

