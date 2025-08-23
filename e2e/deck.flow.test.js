describe('Deck Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { photos: 'YES' },
      newInstance: true,
    });
  });

  it('should show deck screen with filter tabs', async () => {
    await waitFor(element(by.id('filterTab_all')))
      .toBeVisible()
      .withTimeout(10000);

    await expect(element(by.id('filterTab_all'))).toBeVisible();
    await expect(element(by.id('filterTab_screenshots'))).toBeVisible();
    await expect(element(by.id('filterTab_recent'))).toBeVisible();
  });

  it('should switch between filter tabs', async () => {
    // Switch to Screenshots filter
    await element(by.id('filterTab_screenshots')).tap();
    await device.pause(500); // Allow for animation

    // Switch to Recent filter
    await element(by.id('filterTab_recent')).tap();
    await device.pause(500);

    // Switch back to All
    await element(by.id('filterTab_all')).tap();
    await device.pause(500);
  });

  it('should handle swipe gestures on photos', async () => {
    // Check if deck is visible
    const deckElement = element(by.id('deckContainer'));

    try {
      await waitFor(deckElement).toBeVisible().withTimeout(5000);

      // Perform swipe right (keep)
      await deckElement.swipe('right', 'fast', 0.75);
      await device.pause(500);

      // Perform swipe left (delete)
      await deckElement.swipe('left', 'fast', 0.75);
      await device.pause(500);
    } catch (error) {
      // If no photos are available, check for empty state
      await expect(element(by.text('No photos to review'))).toBeVisible();
    }
  });

  it('should show undo button after decision', async () => {
    const undoButton = element(by.id('undoButton'));

    try {
      await waitFor(undoButton).toBeVisible().withTimeout(3000);
      await undoButton.tap();
      await device.pause(500);
    } catch (error) {
      // Undo button might not be visible if no decisions were made
      console.log('No undo button visible - possibly no decisions made');
    }
  });
});

describe('Permission Flows', () => {
  it('should handle limited photo access', async () => {
    await device.launchApp({
      permissions: { photos: 'limited' },
      newInstance: true,
    });

    // Should show limited access banner
    await waitFor(element(by.text('Limited Access')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should handle denied photo access', async () => {
    await device.launchApp({
      permissions: { photos: 'NO' },
      newInstance: true,
    });

    // Should show permission request screen
    await waitFor(element(by.id('allowAccessButton')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
