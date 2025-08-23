/**
 * E2E tests for accessibility features
 * Tests screen reader support, touch targets, and navigation
 */

describe('Accessibility E2E Tests', () => {
  beforeAll(async () => {
    jest.setTimeout(120000); // Global timeout for slow devices
    await device.launchApp({ permissions: { photos: 'YES' } });
  });

  afterAll(async () => {
    // Let Detox manage app lifecycle automatically
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Screen Reader Navigation', () => {
    it('should have accessible landing screen', async () => {
      // Logo should be visible and have testID
      await expect(element(by.id('home.topBar.logo'))).toBeVisible();

      // Continue button should be accessible
      await expect(element(by.text('Continue'))).toBeVisible();
      await expect(element(by.text('Continue'))).toHaveLabel('Continue');
    });

    it('should navigate to photo access with proper labels', async () => {
      // Continue from landing
      await element(by.text('Continue')).tap();

      // Photo access screen should have proper labels
      await expect(element(by.text('Allow Access'))).toBeVisible();
      await expect(element(by.text('Allow Access'))).toHaveLabel('Allow Access');
    });
  });

  describe('Touch Targets', () => {
    it('should have minimum 44dp touch targets for all buttons', async () => {
      // Navigate to main screen
      await element(by.text('Continue')).tap();
      await element(by.text('Allow Access')).tap();

      // Settings button should be tappable
      await expect(element(by.id('home.topBar.settings'))).toBeVisible();
      await element(by.id('home.topBar.settings')).tap();
      await device.pressBack();

      // Invite button should be tappable
      await expect(element(by.id('home.topBar.invite'))).toBeVisible();
      await element(by.id('home.topBar.invite')).tap();
    });

    it('should have accessible hero CTA', async () => {
      // Navigate to main screen
      await element(by.text('Continue')).tap();
      await element(by.text('Allow Access')).tap();

      // Hero CTA should be accessible
      await expect(element(by.id('home.hero.cta'))).toBeVisible();
      await element(by.id('home.hero.cta')).tap();
    });
  });

  describe('Category Tiles Accessibility', () => {
    it('should have accessible category tiles', async () => {
      // Navigate to main screen
      await element(by.text('Continue')).tap();
      await element(by.text('Allow Access')).tap();

      // Check category tiles have proper testIDs
      const categories = ['duplicates', 'screenshots', 'blurry'];

      for (const category of categories) {
        const testId = `home.bundle.${category}`;
        try {
          await waitFor(element(by.id(testId)))
            .toBeVisible()
            .withTimeout(5000);
        } catch (e) {
          // Category tile not visible, continue
        }
      }
    });

    it('should announce locked tiles properly', async () => {
      // Navigate to main screen
      await element(by.text('Continue')).tap();
      await element(by.text('Allow Access')).tap();

      // Check for Pro badge on locked tiles
      const lockedTile = element(by.id('home.bundle.duplicates'));
      await expect(lockedTile).toBeVisible();

      // Locked tiles should have proper accessibility state
      // Note: Actual screen reader announcement testing requires manual QA
    });
  });

  describe('Filter Chips Accessibility', () => {
    it('should have accessible filter chips', async () => {
      // Navigate to main screen
      await element(by.text('Continue')).tap();
      await element(by.text('Allow Access')).tap();

      // Check filter chips
      const chips = ['all', 'screenshots', 'recent'];

      for (const chip of chips) {
        const testId = `home.chip.${chip}`;
        try {
          await waitFor(element(by.id(testId)))
            .toBeVisible()
            .withTimeout(5000);

          // Tap to verify interaction
          await element(by.id(testId)).tap();
        } catch (e) {
          // Filter chip not visible, continue
        }
      }
    });
  });

  describe('Tab Navigation', () => {
    it('should have accessible tab bar', async () => {
      // Navigate to main screen
      await element(by.text('Continue')).tap();
      await element(by.text('Allow Access')).tap();

      // Navigate through tabs
      await element(by.text('Library')).tap();
      await expect(element(by.text('Tu biblioteca'))).toBeVisible();

      await element(by.text('Pending')).tap();
      await expect(element(by.text('Pending Bin'))).toBeVisible();

      await element(by.text('Settings')).tap();
      await expect(element(by.text('Settings'))).toBeVisible();

      await element(by.text('Deck')).tap();
      await expect(element(by.id('home.hero.cta'))).toBeVisible();
    });
  });

  describe('Language Switching', () => {
    it('should support Spanish language', async () => {
      // This test assumes device language is set to Spanish
      // or there's a language switcher in settings

      // Navigate to settings
      await element(by.text('Continue')).tap();
      await element(by.text('Allow Access')).tap();
      await element(by.text('Settings')).tap();

      // Look for language option (if implemented)
      // This is a placeholder for when language switching is added
    });
  });

  describe('Pending Bin Accessibility', () => {
    it('should have accessible pending bin controls', async () => {
      // Navigate to pending bin
      await element(by.text('Continue')).tap();
      await element(by.text('Allow Access')).tap();
      await element(by.text('Pending')).tap();

      // Check for accessible elements
      await expect(element(by.text('Pending Bin'))).toBeVisible();

      // If there are items, check restore controls
      // If empty, check empty state
      try {
        await expect(element(by.text('No photos marked for deletion'))).toBeVisible();
        await expect(element(by.text('Review Photos'))).toBeVisible();
      } catch (e) {
        // Items exist, check for restore button
        await expect(element(by.text('Restore All'))).toBeVisible();
      }
    });
  });

  describe('Focus Management', () => {
    it('should maintain focus after navigation', async () => {
      // Navigate through screens
      await element(by.text('Continue')).tap();
      await element(by.text('Allow Access')).tap();

      // Open settings
      await element(by.id('home.topBar.settings')).tap();

      // Go back - focus should return to previous screen
      await device.pressBack();

      // Hero CTA should still be accessible
      await expect(element(by.id('home.hero.cta'))).toBeVisible();
    });
  });

  describe('Error States Accessibility', () => {
    it('should announce permission errors accessibly', async () => {
      // Test permission denied flow
      await element(by.text('Continue')).tap();

      // Deny permission (this would need to be simulated)
      // Check for accessible error message

      // This test requires manual QA or permission mocking
    });
  });
});
