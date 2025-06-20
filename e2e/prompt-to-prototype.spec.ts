import { test, expect } from '@playwright/test';

test.describe('Prompt to Prototype Flow', () => {
  test('should allow user to submit a prompt and see prototype display', async ({ page }) => {
    // 1. Navigate to the /prompt-to-prototype page
    await page.goto('/prompt-to-prototype');

    // 2. Locate the prompt input field and enter a sample prompt
    const promptInput = page.getByLabelText('Your Prompt');
    await expect(promptInput).toBeVisible();
    await promptInput.fill('A futuristic city with flying cars');

    // 3. Locate and click the submit button
    const generateButton = page.getByRole('button', { name: 'Generate Prototype' });
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // 4. Wait for the prototype display to appear and assert that it contains expected elements
    // Wait for the main heading of the prototype display
    const prototypeHeading = page.getByRole('heading', { name: 'Generated Prototype' });
    await expect(prototypeHeading).toBeVisible({ timeout: 15000 }); // Increased timeout for generation

    // Assert that specific sections are present
    const loglinesHeading = page.getByRole('heading', { name: 'Loglines' });
    await expect(loglinesHeading).toBeVisible();

    const moodBoardHeading = page.getByRole('heading', { name: 'Mood Board' });
    await expect(moodBoardHeading).toBeVisible();

    const shotListHeading = page.getByRole('heading', { name: 'Shot List' });
    await expect(shotListHeading).toBeVisible();

    const animaticDescriptionHeading = page.getByRole('heading', { name: 'Animatic Description' });
    await expect(animaticDescriptionHeading).toBeVisible();

    const pitchSummaryHeading = page.getByRole('heading', { name: 'Pitch Summary' });
    await expect(pitchSummaryHeading).toBeVisible();
  });
});
