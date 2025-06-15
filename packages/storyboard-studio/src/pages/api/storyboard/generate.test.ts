// packages/storyboard-studio/src/pages/api/storyboard/generate.test.ts
import { createMocks, RequestMethod } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from './generate'; // The API route handler
import * as genkitService from '../../../services/generation/genkitService'; // To mock it

// Mock the genkitService
jest.mock('../../../services/generation/genkitService');

// Mock types from @isl/types if they were used directly in the API handler
// For now, the handler uses local mock types, so this isn't strictly necessary yet.
// jest.mock('@isl/types', () => ({ ... }));


describe('/api/storyboard/generate API Endpoint', () => {
  const mockGenerateStoryboardWithGenkit = genkitService.generateStoryboardWithGenkit as jest.Mock;

  beforeEach(() => {
    mockGenerateStoryboardWithGenkit.mockClear();
  });

  test('should return 405 if method is not POST', async () => {
    const { req, res } = createMocks({
      method: 'GET' as RequestMethod, // Type assertion
    });

    // @ts-expect-error TS2352: Conversion of type 'MockRequest<...>' to 'NextApiRequest' may be a mistake.
    await handler(req as NextApiRequest, res as NextApiResponse); // Type assertion

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData().error).toBe('Method GET Not Allowed');
  });

  test('should return 400 if sceneDescription is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        panelCount: 3,
      },
    });
    // @ts-expect-error TS2352: Conversion of type 'MockRequest<...>' to 'NextApiRequest' may be a mistake.
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData().error).toBe('sceneDescription is required and must be a string.');
  });

  test('should return 400 if panelCount is invalid (too low)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        sceneDescription: 'Test',
        panelCount: 1,
      },
    });
    // @ts-expect-error TS2352: Conversion of type 'MockRequest<...>' to 'NextApiRequest' may be a mistake.
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData().error).toBe('panelCount is required and must be a number between 2 and 10.');
  });

  test('should return 400 if panelCount is invalid (too high)', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        sceneDescription: 'Test',
        panelCount: 11,
      },
    });
    // @ts-expect-error TS2352: Conversion of type 'MockRequest<...>' to 'NextApiRequest' may be a mistake.
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData().error).toBe('panelCount is required and must be a number between 2 and 10.');
  });

  test('should return 400 if panelCount is not a number', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        sceneDescription: 'Test',
        panelCount: "five",
      },
    });
    // @ts-expect-error TS2352: Conversion of type 'MockRequest<...>' to 'NextApiRequest' may be a mistake.
    await handler(req as NextApiRequest, res as NextApiResponse);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData().error).toBe('panelCount is required and must be a number between 2 and 10.');
  });


  test('should call genkitService.generateStoryboardWithGenkit with correct params and return 200 on success', async () => {
    const mockRequestBody = {
      sceneDescription: 'A valid test scene',
      panelCount: 5,
      stylePreset: 'cinematic',
    };
    const mockStoryboardPackage = {
      id: 'sb_123',
      ...mockRequestBody,
      panels: [{id:'p1', imageURL:'url1', previewURL:'purl1', alt:'alt1', caption:'cap1', generatedAt: new Date().toISOString()}], // Simplified
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockGenerateStoryboardWithGenkit.mockResolvedValue(mockStoryboardPackage);

    const { req, res } = createMocks({
      method: 'POST',
      body: mockRequestBody,
    });

    // @ts-expect-error TS2352: Conversion of type 'MockRequest<...>' to 'NextApiRequest' may be a mistake.
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(mockGenerateStoryboardWithGenkit).toHaveBeenCalledTimes(1);
    expect(mockGenerateStoryboardWithGenkit).toHaveBeenCalledWith(
      expect.objectContaining(mockRequestBody),
      expect.any(Function) // For the onProgress callback
    );
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ status: 'success', package: mockStoryboardPackage });
  });

  test('should return 500 if genkitService throws an error', async () => {
    const mockRequestBody = {
      sceneDescription: 'Scene that causes error',
      panelCount: 2,
    };
    const errorMessage = 'Genkit simulation failed';
    mockGenerateStoryboardWithGenkit.mockRejectedValue(new Error(errorMessage));

    const { req, res } = createMocks({
      method: 'POST',
      body: mockRequestBody,
    });

    // @ts-expect-error TS2352: Conversion of type 'MockRequest<...>' to 'NextApiRequest' may be a mistake.
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(mockGenerateStoryboardWithGenkit).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ status: 'error', message: errorMessage });
  });
});
