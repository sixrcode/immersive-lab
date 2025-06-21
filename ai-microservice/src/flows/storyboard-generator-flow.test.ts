import { generateStoryboard, StoryboardGeneratorInput } from './storyboard-generator-flow';
// Import 'ai' for use in tests, and the special testing-only export from the mocked module.
// Note: The actual '../genkit' module does not export __actualCallablePromptMockForTestsOnly.
// Jest's mock system will provide it based on the factory function below.
import { ai, __actualCallablePromptMockForTestsOnly } from '../genkit';

jest.mock('../genkit', () => {
  const localActualCallablePromptMock = jest.fn();
  return {
    ai: {
      definePrompt: jest.fn(() => localActualCallablePromptMock),
      generate: jest.fn(),
      defineFlow: jest.fn((config, func) => func),
    },
    // Expose the locally created mock so tests can access it.
    __actualCallablePromptMockForTestsOnly: localActualCallablePromptMock,
  };
});

const mockTextGenerationPromptOutput = (panels: any[], titleSuggestion: string = 'Test Title') => {
  // Access the exposed mock to configure it.
  (__actualCallablePromptMockForTestsOnly as jest.Mock).mockResolvedValueOnce({
    output: {
      panels,
      titleSuggestion,
    },
  });
};

const mockImageGeneration = () => {
  // ai.generate is the jest.fn() from the mock factory, accessed via the imported 'ai'.
  (ai.generate as jest.Mock).mockImplementation(async (args: any) => {
    const panelDescription = args.prompt[0].text.match(/Scene: (.*?)\./)?.[1] || 'Test Alt Text';
    return Promise.resolve({
      media: {
        url: `data:image/png;base64,test-image-data-for-${panelDescription.replace(/\s+/g, '-')}`,
      },
    });
  });
};

describe('storyboardGeneratorFlow', () => {
  const basicInput: StoryboardGeneratorInput = {
    sceneDescription: 'A test scene',
    numPanels: 2,
  };

  beforeEach(() => {
    // Clear all necessary mocks.
    (__actualCallablePromptMockForTestsOnly as jest.Mock).mockClear();
    (ai.generate as jest.Mock).mockClear();
    (ai.definePrompt as jest.Mock).mockClear(); // Clear the factory function mock too.
  });

  test('Scenario 1: Panels returned by AI are already in order', async () => {
    const mockPanels = [
      { panelNumber: 1, description: 'Panel 1 desc', shotDetails: 'Shot 1' },
      { panelNumber: 2, description: 'Panel 2 desc', shotDetails: 'Shot 2' },
    ];
    mockTextGenerationPromptOutput(mockPanels);
    mockImageGeneration();

    const result = await generateStoryboard(basicInput);

    expect(result.panels.length).toBe(2);
    expect(result.panels[0].panelNumber).toBe(1);
    expect(result.panels[1].panelNumber).toBe(2);
    expect(result.panels[0].description).toBe('Panel 1 desc');
    expect(result.panels[1].alt).toBe('Panel 2 desc'); // Corrected: alt is the description
    expect(result.titleSuggestion).toBe('Test Title');
  });

  test('Scenario 2: Panels returned by AI are out of order', async () => {
    const mockPanels = [
      { panelNumber: 2, description: 'Panel 2 desc', shotDetails: 'Shot 2' },
      { panelNumber: 1, description: 'Panel 1 desc', shotDetails: 'Shot 1' },
    ];
    mockTextGenerationPromptOutput(mockPanels);
    mockImageGeneration();

    const result = await generateStoryboard(basicInput);

    expect(result.panels.length).toBe(2);
    expect(result.panels[0].panelNumber).toBe(1);
    expect(result.panels[1].panelNumber).toBe(2);
    expect(result.panels[0].description).toBe('Panel 1 desc');
    expect(result.panels[1].description).toBe('Panel 2 desc');
  });

  test('Scenario 3: Panels with more items, out of order', async () => {
    const mockPanels = [
      { panelNumber: 3, description: 'Panel 3 desc', shotDetails: 'Shot 3' },
      { panelNumber: 1, description: 'Panel 1 desc', shotDetails: 'Shot 1' },
      { panelNumber: 2, description: 'Panel 2 desc', shotDetails: 'Shot 2' },
    ];
    mockTextGenerationPromptOutput(mockPanels, 'Complex Scene Title');
    mockImageGeneration();

    const result = await generateStoryboard({ ...basicInput, numPanels: 3 });

    expect(result.panels.length).toBe(3);
    expect(result.panels[0].panelNumber).toBe(1);
    expect(result.panels[1].panelNumber).toBe(2);
    expect(result.panels[2].panelNumber).toBe(3);
    expect(result.panels[0].description).toBe('Panel 1 desc');
    expect(result.panels[1].shotDetails).toBe('Shot 2');
    expect(result.panels[2].alt).toBe('Panel 3 desc'); // Corrected: alt is the description
    expect(result.titleSuggestion).toBe('Complex Scene Title');
  });

  test('Scenario 4: Preservation of data (all fields)', async () => {
    const mockPanels = [
      { panelNumber: 2, description: 'Second Panel Details', shotDetails: 'Medium Shot', dialogueOrSound: 'Boom!' },
      { panelNumber: 1, description: 'First Panel Details', shotDetails: 'Wide Shot', dialogueOrSound: 'Silence...' },
    ];
    const specificTitle = "Specific Test Title";
    mockTextGenerationPromptOutput(mockPanels, specificTitle);

    // Custom mock for ai.generate for this test to ensure data is passed correctly
    // Directly configure ai.generate for this specific test
    (ai.generate as jest.Mock).mockImplementation(async (args: any) => {
      const panelDesc = args.prompt[0].text.match(/Scene: (.*?)\. Shot/)?.[1];
      return Promise.resolve({
        media: {
          url: `data:image/png;base64,image-for-${panelDesc?.replace(/\s/g, '_')}`,
        },
      });
    });

    const result = await generateStoryboard(basicInput);

    expect(result.panels.length).toBe(2);
    expect(result.titleSuggestion).toBe(specificTitle);

    // Panel 1 (after sorting)
    expect(result.panels[0].panelNumber).toBe(1);
    expect(result.panels[0].description).toBe('First Panel Details');
    expect(result.panels[0].shotDetails).toBe('Wide Shot');
    expect(result.panels[0].dialogueOrSound).toBe('Silence...');
    expect(result.panels[0].alt).toBe('First Panel Details'); // Alt text is the description
    expect(result.panels[0].imageDataUri).toContain('image-for-First_Panel_Details');

    // Panel 2 (after sorting)
    expect(result.panels[1].panelNumber).toBe(2);
    expect(result.panels[1].description).toBe('Second Panel Details');
    expect(result.panels[1].shotDetails).toBe('Medium Shot');
    expect(result.panels[1].dialogueOrSound).toBe('Boom!');
    expect(result.panels[1].alt).toBe('Second Panel Details');
    expect(result.panels[1].imageDataUri).toContain('image-for-Second_Panel_Details');
  });

  test('Handles image generation failure gracefully', async () => {
    const mockPanels = [
      { panelNumber: 1, description: 'Panel 1 success', shotDetails: 'Shot 1' },
      { panelNumber: 2, description: 'Panel 2 failure', shotDetails: 'Shot 2' },
    ];
    mockTextGenerationPromptOutput(mockPanels);

    (ai.generate as jest.Mock)
      .mockImplementationOnce(async () => ({ media: { url: 'data:image/png;base64,success-image' } }))
      .mockImplementationOnce(async () => ({ media: null })); // Simulate failure for the second panel

    const result = await generateStoryboard(basicInput);

    expect(result.panels.length).toBe(2);
    expect(result.panels[0].imageDataUri).toBe('data:image/png;base64,success-image');
    expect(result.panels[0].alt).toBe('Panel 1 success');
    expect(result.panels[1].imageDataUri).toContain('https://placehold.co/512x384.png?text=Image+Gen+Failed+P2');
    expect(result.panels[1].alt).toBe('Panel 2 failure'); // Alt text should still be original description
  });

   test('Handles image generation error gracefully', async () => {
    const mockPanels = [
      { panelNumber: 1, description: 'Panel 1 error', shotDetails: 'Shot 1' },
    ];
    mockTextGenerationPromptOutput(mockPanels);

    (ai.generate as jest.Mock).mockImplementationOnce(async () => {
      throw new Error("Simulated image generation error");
    });

    const result = await generateStoryboard({...basicInput, numPanels: 1});

    expect(result.panels.length).toBe(1);
    expect(result.panels[0].imageDataUri).toContain('https://placehold.co/512x384.png?text=Image+Error+P1');
    expect(result.panels[0].alt).toBe('Panel 1 error');
  });

  test('Handles text generation failure', async () => {
    (__actualCallablePromptMockForTestsOnly as jest.Mock).mockResolvedValueOnce({ output: null });

    await expect(generateStoryboard(basicInput))
      .rejects
      .toThrow("Failed to generate textual descriptions for storyboard panels.");
  });

  test('Handles text generation returning empty panels array', async () => {
    mockTextGenerationPromptOutput([]); // Empty panels

    await expect(generateStoryboard(basicInput))
      .rejects
      .toThrow("Failed to generate textual descriptions for storyboard panels.");
  });

});
