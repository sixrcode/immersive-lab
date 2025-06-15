// packages/storyboard-studio/src/utils/download.test.ts
import { downloadStoryboardJson, downloadFullStoryboardZip } from './download';

// Mock StoryboardPackage type if imported from @isl/types
// jest.mock('@isl/types', () => ({ ... }));

describe('download utility', () => {
  const mockStoryboardPackage = {
    id: 'sb_test_123',
    title: 'Test Storyboard',
    sceneDescription: 'A test scene for download',
    panelCount: 2,
    stylePreset: 'test-style',
    panels: [
      { id: 'p1', imageURL: 'url1', previewURL: 'purl1', alt: 'alt1', caption: 'Panel 1' },
      { id: 'p2', imageURL: 'url2', previewURL: 'purl2', alt: 'alt2', caption: 'Panel 2' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let createElementSpy: jest.SpyInstance;
  let appendChildSpy: jest.SpyInstance;
  let removeChildSpy: jest.SpyInstance;
  let clickSpy: jest.SpyInstance;
  let createObjectURLSpy: jest.SpyInstance;
  let revokeObjectURLSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;


  beforeEach(() => {
    // Mock DOM manipulation and URL object methods
    clickSpy = jest.fn();
    createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
      style: {}
    } as any);
    appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(node => node);
    removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(node => node);

    createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/mock-url');
    revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('downloadStoryboardJson', () => {
    test('should create a link and trigger download for JSON', () => {
      downloadStoryboardJson(mockStoryboardPackage, 'test-file.json');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/mock-url');

      const link = createElementSpy.mock.results[0].value;
      expect(link.download).toBe('test-file.json');
      expect(link.href).toBe('blob:http://localhost/mock-url');

      const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('application/json');
      // Potentially read blob content to verify JSON string if necessary
    });

    test('should use default filename if not provided', () => {
      downloadStoryboardJson(mockStoryboardPackage);
      const link = createElementSpy.mock.results[0].value;
      expect(link.download).toBe(`storyboard-${mockStoryboardPackage.id}.json`);
    });

    test('should log error and not proceed if storyboardPackage is null', () => {
      downloadStoryboardJson(null as any); // Cast to any to bypass TS error for test
      expect(consoleErrorSpy).toHaveBeenCalledWith("No storyboard package data provided to download.");
      expect(createElementSpy).not.toHaveBeenCalled();
    });

    test('should handle JSON.stringify error', () => {
      const circularPackage: any = { id: 'circ' };
      circularPackage.self = circularPackage; // Create circular reference

      downloadStoryboardJson(circularPackage);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error preparing storyboard JSON for download:", expect.any(TypeError));
      expect(alertSpy).toHaveBeenCalledWith("Failed to prepare storyboard data for download. See console for details.");
      expect(createElementSpy).not.toHaveBeenCalled();
    });
  });

  describe('downloadFullStoryboardZip', () => {
    test('should call downloadStoryboardJson as a fallback and warn/alert', async () => {
      // Spy on downloadStoryboardJson to see if it's called by downloadFullStoryboardZip
      const downloadJsonInternalSpy = jest.spyOn(require('./download'), 'downloadStoryboardJson');

      await downloadFullStoryboardZip(mockStoryboardPackage, 'test-zip.zip');

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("downloadFullStoryboardZip is a placeholder"));
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Full ZIP download with images is not yet implemented"));
      expect(downloadJsonInternalSpy).toHaveBeenCalledWith(
        mockStoryboardPackage,
        `TEMP_JSON_ONLY_test-zip.json`
      );
      downloadJsonInternalSpy.mockRestore(); // Clean up the spy on the module itself
    });
  });
});
