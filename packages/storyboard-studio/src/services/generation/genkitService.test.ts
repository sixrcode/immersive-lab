// packages/storyboard-studio/src/services/generation/genkitService.test.ts

import { generateStoryboardWithGenkit, enhanceScenePrompt } from './genkitService';
// Mock the persistence service that is now used by genkitService
jest.mock('../persistence/firebaseService', () => ({
  uploadImageToStorage: jest.fn((content, path) => Promise.resolve(`mock://uploaded/${path}`)),
  saveStoryboardToFirestore: jest.fn(() => Promise.resolve()),
}));

// Mock types if they were imported from @isl/types
// jest.mock('@isl/types', () => ({ ... }));

describe('genkitService', () => {
  describe('generateStoryboardWithGenkit', () => {
    const mockOnProgress = jest.fn();

    beforeEach(() => {
      mockOnProgress.mockClear();
      // Clear mocks for firebaseService functions
      require('../persistence/firebaseService').uploadImageToStorage.mockClear();
      require('../persistence/firebaseService').saveStoryboardToFirestore.mockClear();
    });

    test('should generate a storyboard package with the correct number of panels', async () => {
      const props = {
        sceneDescription: 'Test scene',
        panelCount: 3,
        stylePreset: 'test-style',
      };
      const result = await generateStoryboardWithGenkit(props, mockOnProgress);

      expect(result.panels.length).toBe(3);
      expect(result.sceneDescription).toBe(props.sceneDescription);
      expect(result.stylePreset).toBe(props.stylePreset);
      expect(result.id).toMatch(/^sb_\d+$/);
    });

    test('should call onProgress with processing and success updates', async () => {
      const props = { sceneDescription: 'Progress test', panelCount: 2 };
      await generateStoryboardWithGenkit(props, mockOnProgress);

      expect(mockOnProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing', progress: 0 }));
      // For each panel (2 panels)
      expect(mockOnProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing', progress: 50, panelId: expect.any(String) }));
      expect(mockOnProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing', progress: 100, panelId: expect.any(String) }));
      // Final success
      expect(mockOnProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'success', package: expect.any(Object) }));
      expect(mockOnProgress.mock.calls.length).toBe(2 * 2 + 2); // Start, N*panel_updates, save_update (implicit), final success
    });

    test('each panel should have required fields and mocked URLs from persistence', async () => {
      const props = { sceneDescription: 'Panel structure test', panelCount: 1 };
      const result = await generateStoryboardWithGenkit(props);

      const panel = result.panels[0];
      expect(panel.id).toMatch(/^panel_\d+_0$/);
      expect(panel.imageURL).toMatch(/^mock:\/\/uploaded\/storyboards\/sb_\d+\/panels\/panel_\d+_0\/image.png$/);
      expect(panel.previewURL).toMatch(/^mock:\/\/uploaded\/storyboards\/sb_\d+\/panels\/panel_\d+_0\/preview.webp$/);
      expect(panel.alt).toContain('Panel 1');
      expect(panel.caption).toBe('Panel 1: Your action or dialogue here.');
      expect(panel.generatedAt).toBeDefined();
    });

    test('should call mocked persistence functions', async () => {
      const props = { sceneDescription: 'Persistence test', panelCount: 2 };
      await generateStoryboardWithGenkit(props, mockOnProgress);

      const { uploadImageToStorage, saveStoryboardToFirestore } = require('../persistence/firebaseService');

      // Called twice for each panel (image + preview)
      expect(uploadImageToStorage).toHaveBeenCalledTimes(props.panelCount * 2);
      expect(uploadImageToStorage).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('image.png'));
      expect(uploadImageToStorage).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('preview.webp'));

      expect(saveStoryboardToFirestore).toHaveBeenCalledTimes(1);
      expect(saveStoryboardToFirestore).toHaveBeenCalledWith(expect.objectContaining({
        id: expect.stringMatching(/^sb_\d+$/),
        panels: expect.any(Array),
      }));
    });
  });

  describe('enhanceScenePrompt', () => {
    test('should return an enhanced prompt string', async () => {
      const prompt = 'A simple scene';
      const result = await enhanceScenePrompt(prompt);
      expect(result).toContain('Enhanced:');
      expect(result).toContain(prompt);
    });
  });
});
