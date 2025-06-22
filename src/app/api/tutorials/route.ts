import { NextResponse } from 'next/server';
import { mockTutorials } from '@/lib/mock-tutorials';
import { Tutorial } from '../../../../packages/types/src/tutorial.types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as Tutorial['category'] | null;
  const difficulty = searchParams.get('difficulty') as Tutorial['difficulty'] | null;
  const sortBy = searchParams.get('sortBy') as keyof Tutorial | null;
  const order = searchParams.get('order') || 'asc'; // Default to ascending, 'desc' for descending

  let tutorials: Tutorial[] = [...mockTutorials];

  // Apply filtering
  if (category) {
    tutorials = tutorials.filter(t => t.category === category);
  }

  if (difficulty) {
    tutorials = tutorials.filter(t => t.difficulty === difficulty);
  }

  // Apply sorting
  if (sortBy) {
    tutorials.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];

      let comparison = 0;

      if (sortBy === 'publishDate') {
        comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
      } else if (sortBy === 'popularity') {
        comparison = (valA as number) - (valB as number);
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.toLowerCase().localeCompare(valB.toLowerCase());
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      }
      // Add more type handling if necessary, e.g. for boolean or other complex types

      return order === 'asc' ? comparison : -comparison;
    });
  }

  return NextResponse.json(tutorials);
}
