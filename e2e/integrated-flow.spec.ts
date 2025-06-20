import { test, expect } from '@playwright/test';

test.describe('Integrated Prompt-to-Prototype to Storyboard Studio Flow', () => {
  test('should generate a prototype and use its output to generate a storyboard', async ({ page }) => {
    // Part 1: Prompt-to-Prototype
    await page.goto('/prompt-to-prototype');

    // Enter prompt
    const promptInput = page.getByLabelText('Your Prompt');
    await expect(promptInput).toBeVisible();
    await promptInput.fill('A medieval knight battling a fiery dragon on a mountain top');

    // Click generate
    const generatePrototypeButton = page.getByRole('button', { name: 'Generate Prototype' });
    await expect(generatePrototypeButton).toBeVisible();
    await generatePrototypeButton.click();

    // Wait for prototype display and extract logline
    const loglinesHeading = page.getByRole('heading', { name: 'Loglines' });
    await expect(loglinesHeading).toBeVisible({ timeout: 20000 }); // Wait for generation

    // Locate the first logline text. Structure: Section -> Card -> CardContent -> p
    // This selector targets the <p> element within the first Card under the "Loglines" section.
    const firstLoglineCard = page.locator('section:has(:text("Loglines")) >> div[role="listitem"], section:has(:text("Loglines")) >> article').first();
    const firstLoglineTextElement = firstLoglineCard.locator('p').first();

    await expect(firstLoglineTextElement).toBeVisible();
    const extractedLogline = await firstLoglineTextElement.textContent();
    expect(extractedLogline).toBeTruthy(); // Ensure some text was extracted

    if (!extractedLogline) {
      throw new Error("Could not extract logline text.");
    }

    console.log(`Extracted Logline: ${extractedLogline}`);

    // Part 2: Storyboard Studio
    await page.goto('/storyboard-studio');

    // Use extracted logline as scene description
    const sceneDescriptionInput = page.getByLabelText('Scene Description:');
    await expect(sceneDescriptionInput).toBeVisible();
    await sceneDescriptionInput.fill(extractedLogline);

    const panelCountInput = page.getByLabelText('Panel Count (2-10):');
    await expect(panelCountInput).toBeVisible();
    await panelCountInput.fill('2'); // Example panel count

    // Click generate storyboard
    const generateStoryboardButton = page.getByRole('button', { name: 'Generate Storyboard' });
    await expect(generateStoryboardButton).toBeVisible();
    await generateStoryboardButton.click();

    // Wait for storyboard panels to appear
    const storyboardGridView = page.locator('.storyboard-grid-view');
    await expect(storyboardGridView).toBeVisible({ timeout: 20000 }); // Wait for generation

    // Assert that storyboard panels are displayed
    const panels = storyboardGridView.locator('.storyboard-grid-panel');
    await expect(panels.count()).toBeGreaterThan(0);

    const panelImages = panels.locator('img');
    await expect(panelImages.count()).toBeGreaterThan(0);
    // Check that the number of images matches the expected panel count
    await expect(panelImages.count()).toEqual(2);

    for (let i = 0; i < (await panelImages.count()); i++) {
      await expect(panelImages.nth(i)).toHaveAttribute('src', /.*/);
    }
  });
});
