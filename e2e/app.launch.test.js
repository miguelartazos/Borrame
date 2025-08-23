describe('App Launch', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { photos: 'NO' },
      newInstance: true,
    });
  });

  it('should show permission request screen on first launch', async () => {
    // Check if the RequestPhotos component is visible
    await expect(element(by.text('SwipeClean needs access'))).toBeVisible();
    await expect(element(by.text('Allow Access to Photos'))).toBeVisible();
  });

  it('should have allow access button', async () => {
    await expect(element(by.text('Allow Access to Photos'))).toBeVisible();
  });
});

describe('App with Permissions', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { photos: 'YES' },
      newInstance: true,
    });
  });

  it('should navigate to deck screen when permissions are granted', async () => {
    // Wait for navigation to deck screen
    await waitFor(element(by.text('All Photos')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show filter tabs', async () => {
    await expect(element(by.text('All Photos'))).toBeVisible();
    await expect(element(by.text('Screenshots'))).toBeVisible();
    await expect(element(by.text('Reviewed'))).toBeVisible();
  });
});
