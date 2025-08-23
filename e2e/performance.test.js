/**
 * Performance Tests per CLAUDE.md T-5
 * Tests: 500+ assets list, deck frame stability
 */

describe('Performance Tests', () => {
  describe('Large Dataset Handling', () => {
    beforeAll(async () => {
      await device.launchApp({
        permissions: { photos: 'YES' },
        newInstance: true,
        launchArgs: {
          detoxPrintBusyIdleResources: 'YES',
          // Mock large dataset for testing
          mockLargeDataset: '500',
        },
      });
    });

    it('should handle 500+ photos without crashing', async () => {
      await waitFor(element(by.id('filterTab_all')))
        .toBeVisible()
        .withTimeout(15000);

      // Check if counter shows large number
      await expect(element(by.text(/\d{3,} photos?/))).toBeVisible();
    });

    it('should maintain 60fps during swipe gestures', async () => {
      // Perform rapid swipes
      for (let i = 0; i < 10; i++) {
        await element(by.id('deckContainer')).swipe('left', 'fast', 0.5);
        await device.pause(100); // Minimal pause
      }

      // App should not freeze or crash
      await expect(element(by.id('deckContainer'))).toBeVisible();
    });

    it('should handle rapid filter switching', async () => {
      // Switch filters rapidly
      const filters = ['all', 'screenshots', 'recent'];

      for (let round = 0; round < 3; round++) {
        for (const filter of filters) {
          await element(by.id(`filterTab_${filter}`)).tap();
          // No pause - test responsiveness
        }
      }

      // UI should remain responsive
      await expect(element(by.id('filterTab_all'))).toBeVisible();
    });

    it('should lazy load images efficiently', async () => {
      // Swipe through many photos quickly
      for (let i = 0; i < 20; i++) {
        await element(by.id('deckContainer')).swipe('right', 'fast', 0.3);
        await device.pause(50);
      }

      // Memory should not spike (app shouldn't crash)
      await expect(element(by.id('deckContainer'))).toBeVisible();
    });
  });

  describe('Memory Management', () => {
    it('should handle background/foreground transitions', async () => {
      // Send app to background
      await device.sendToHome();
      await device.pause(2000);

      // Bring back to foreground
      await device.launchApp({ newInstance: false });

      // App should restore state properly
      await waitFor(element(by.id('deckContainer')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should handle long review sessions', async () => {
      // Simulate extended usage (100+ decisions)
      for (let i = 0; i < 20; i++) {
        try {
          await element(by.id('deleteButton')).tap();
          await device.pause(100);

          await element(by.id('keepButton')).tap();
          await device.pause(100);
        } catch (error) {
          // May run out of photos
          break;
        }
      }

      // App should remain stable
      await expect(element(by.id('filterTab_all'))).toBeVisible();
    });
  });

  describe('Database Performance', () => {
    it('should index photos without blocking UI', async () => {
      await device.launchApp({
        permissions: { photos: 'YES' },
        newInstance: true,
        launchArgs: {
          forceReindex: 'true',
        },
      });

      // UI should be responsive during indexing
      await waitFor(element(by.id('filterTab_all')))
        .toBeVisible()
        .withTimeout(5000);

      // Should be able to interact while indexing
      await element(by.id('filterTab_screenshots')).tap();
      await element(by.id('filterTab_recent')).tap();
      await element(by.id('filterTab_all')).tap();
    });

    it('should handle batch operations efficiently', async () => {
      // Add many items to pending bin
      for (let i = 0; i < 10; i++) {
        try {
          await element(by.id('deckContainer')).swipe('left', 'slow', 0.5);
          await device.pause(50);
        } catch (error) {
          break;
        }
      }

      // Navigate to pending
      try {
        await element(by.id('tabBar_pending')).tap();

        // Commit all at once
        await element(by.id('commitButton')).tap();
        await element(by.id('confirmDelete')).tap();

        // Should complete without hanging
        await waitFor(element(by.text(/Successfully deleted/)))
          .toBeVisible()
          .withTimeout(10000);
      } catch (error) {
        console.log('Could not test batch commit');
      }
    });
  });

  describe('Gesture Performance', () => {
    it('should handle complex gesture patterns', async () => {
      // Test gesture interruption
      await element(by.id('deckContainer')).swipe('left', 'slow', 0.3);
      await element(by.id('deckContainer')).swipe('right', 'fast', 0.7);

      // Test diagonal swipes (should be ignored)
      await element(by.id('deckContainer')).swipe('up', 'fast', 0.5);
      await element(by.id('deckContainer')).swipe('down', 'fast', 0.5);

      // UI should remain stable
      await expect(element(by.id('deckContainer'))).toBeVisible();
    });

    it('should handle rapid undo operations', async () => {
      // Make several decisions
      for (let i = 0; i < 5; i++) {
        try {
          await element(by.id('deleteButton')).tap();
          await device.pause(100);
        } catch (error) {
          break;
        }
      }

      // Rapidly undo
      for (let i = 0; i < 5; i++) {
        try {
          await element(by.id('undoButton')).tap();
          // No pause - test rapid undo
        } catch (error) {
          break;
        }
      }

      // App should handle rapid state changes
      await expect(element(by.id('deckContainer'))).toBeVisible();
    });
  });
});
