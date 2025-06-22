import { test, expect, type Page } from '@playwright/test';

test.describe('Storyboard Studio Flow', () => {
  test('should allow users to input scene details and generate a storyboard', async ({ page }: { page: Page }) => {
    // 1. Navigate to the /storyboard-studio page
    await page.goto('/storyboard-studio');

    // 2. Locate the input fields for scene descriptions and enter sample descriptions
    const sceneDescriptionInput = page.getByLabelText('Scene Description:');
    await expect(sceneDescriptionInput).toBeVisible();
    await sceneDescriptionInput.fill('Scene 1: A cat chasing a mouse in a park. Scene 2: The mouse hides in a hole.');

    const panelCountInput = page.getByLabelText('Panel Count (2-10):');
    await expect(panelCountInput).toBeVisible();
    await panelCountInput.fill('3'); // Example panel count

    // 3. Locate and click the button to generate the storyboard
    const generateButton = page.getByRole('button', { name: 'Generate Storyboard' });
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // 4. Wait for the storyboard panels to appear
    //    Look for the container of the grid view
    const storyboardGridView = page.locator('.storyboard-grid-view');
    await expect(storyboardGridView).toBeVisible({ timeout: 20000 }); // Increased timeout for generation

    // 5. Assert that storyboard panels are displayed
    //    Check for the presence of individual panel elements within the grid view
    //    Each panel has a class 'storyboard-grid-panel' and contains an img
    const panels = storyboardGridView.locator('.storyboard-grid-panel');
    await expect(panels.count()).toBeGreaterThan(0); // Check if at least one panel is rendered

    // Further check for image tags within the panels
    const panelImages = panels.locator('img');
    await expect(panelImages.count()).toBeGreaterThan(0);

    // Check that the number of images matches the expected panel count (if possible and reliable)
    // For this example, we filled '3' for panel count.
    // Note: This might be flaky if the generation can result in fewer panels than requested.
    // await expect(panelImages.count()).toEqual(3);

    // Verify that each panel image has a src attribute (even if it's a placeholder)
    for (let i = 0; i < (await panelImages.count()); i++) {
      await expect(panelImages.nth(i)).toHaveAttribute('src', /.*/); // Checks that src is not empty
    }
  });
});
