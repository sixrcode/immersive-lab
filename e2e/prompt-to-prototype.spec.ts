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

  test('should generate content reflecting the selected style preset', async ({ page }) => {
    // 1. Navigate to /prompt-to-prototype
    await page.goto('/prompt-to-prototype');

    // 2. Enter the prompt
    const promptInput = page.getByLabelText('Your Prompt');
    await promptInput.fill('A group of teenagers explore an abandoned, decrepit hospital rumored to be haunted by the spirit of a malevolent surgeon.');

    // 3. Select the "Horror" style preset
    await page.locator('#style-preset').click();
    await page.getByRole('option', { name: 'Horror' }).click();

    // 4. Click the "Generate Prototype" button
    const generateButton = page.getByRole('button', { name: 'Generate Prototype' });
    await generateButton.click();

    // 5. Wait for the "Generated Prototype" heading to appear
    const prototypeHeading = page.getByRole('heading', { name: 'Generated Prototype' });
    await expect(prototypeHeading).toBeVisible({ timeout: 30000 });

    // 6. Assert that the "Loglines" section is visible
    const loglinesHeading = page.getByRole('heading', { name: 'Loglines' });
    await expect(loglinesHeading).toBeVisible();

    // 7. Get the text content of the entire "Loglines" section
    const loglinesSection = await page.locator('section:has(h3:has-text("Loglines"))').textContent();
    expect(loglinesSection).not.toBeNull();

    // 8. Assert that this text content (converted to lowercase) contains at least one of the horror-related keywords
    const horrorKeywords = ["eerie", "dark", "shadow", "fright", "haunted", "terror", "creepy", "sinister", "grim", "spooky", "dread", "macabre", "chilling", "ghost", "spirit"];
    const loglinesTextLower = loglinesSection!.toLowerCase();
    const containsHorrorKeyword = horrorKeywords.some(keyword => loglinesTextLower.includes(keyword));
    expect(containsHorrorKeyword).toBe(true);

    // 9. Verify that the "Original Input" section displays "Style Preset: Horror"
    const stylePresetDisplay = page.locator('p:has-text("Style Preset:")').getByText('Horror');
    await expect(stylePresetDisplay).toBeVisible();
  });
});
