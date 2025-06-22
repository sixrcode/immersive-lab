import { GET } from './route'; // Assuming GET is the handler function
import { mockTutorials } from '@/lib/mock-tutorials';
import { NextRequest } from 'next/server';
import { Tutorial } from 'packages/types/src/tutorial.types';

// Mock NextRequest if necessary, or use a simplified request object for testing
const createMockRequest = (queryParams: Record<string, string>): NextRequest => {
  const url = new URL(`http://localhost/api/tutorials?${new URLSearchParams(queryParams).toString()}`);
  return new NextRequest(url.toString());
};

describe('Tutorials API Endpoint (GET)', () => {
  it('should return all tutorials when no filters are applied', async () => {
    const request = createMockRequest({});
    const response = await GET(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.length).toBe(mockTutorials.length);
  });

  it('should filter tutorials by difficulty "Beginner"', async () => {
    const request = createMockRequest({ difficulty: 'Beginner' });
    const response = await GET(request);
    const data: Tutorial[] = await response.json();
    expect(response.status).toBe(200);
    expect(data.every(t => t.difficulty === 'Beginner')).toBe(true);
    const expectedCount = mockTutorials.filter(t => t.difficulty === 'Beginner').length;
    expect(data.length).toBe(expectedCount);
  });

  it('should filter tutorials by category "VR"', async () => {
    const request = createMockRequest({ category: 'VR' });
    const response = await GET(request);
    const data: Tutorial[] = await response.json();
    expect(response.status).toBe(200);
    expect(data.every(t => t.category === 'VR')).toBe(true);
    const expectedCount = mockTutorials.filter(t => t.category === 'VR').length;
    expect(data.length).toBe(expectedCount);
  });

  it('should sort tutorials by publishDate descending (Newest first)', async () => {
    const request = createMockRequest({ sortBy: 'publishDate', order: 'desc' });
    const response = await GET(request);
    const data: Tutorial[] = await response.json();
    expect(response.status).toBe(200);
    for (let i = 0; i < data.length - 1; i++) {
      expect(new Date(data[i].publishDate).getTime()).toBeGreaterThanOrEqual(new Date(data[i+1].publishDate).getTime());
    }
  });

  it('should sort tutorials by popularity descending', async () => {
    const request = createMockRequest({ sortBy: 'popularity', order: 'desc' });
    const response = await GET(request);
    const data: Tutorial[] = await response.json();
    expect(response.status).toBe(200);
    for (let i = 0; i < data.length - 1; i++) {
      expect(data[i].popularity).toBeGreaterThanOrEqual(data[i+1].popularity);
    }
  });

  it('should sort tutorials by title ascending', async () => {
    const request = createMockRequest({ sortBy: 'title', order: 'asc' });
    const response = await GET(request);
    const data: Tutorial[] = await response.json();
    expect(response.status).toBe(200);
    for (let i = 0; i < data.length - 1; i++) {
      expect(data[i].title.localeCompare(data[i+1].title)).toBeLessThanOrEqual(0);
    }
  });

  it('should handle empty or invalid filters gracefully', async () => {
    const request = createMockRequest({ category: 'NonExistentCategory', difficulty: 'SuperHard', sortBy: 'nonExistentField' });
    const response = await GET(request);
    const data: Tutorial[] = await response.json();
    expect(response.status).toBe(200);
    // Depending on logic, this might return all tutorials or an empty list.
    // Current logic will return an empty list if filters don't match any.
    // If sortBy is invalid, it might sort by default or not at all.
    // For this test, we'll check it doesn't crash and returns a valid JSON response.
    expect(Array.isArray(data)).toBe(true);
  });

});
