'use client';

import React, { useEffect, useState } from 'react';
import { Tutorial } from 'packages/types/src/tutorial.types';
import TutorialCard from './TutorialCard';
import { Skeleton } from '@/components/ui/skeleton';

interface TutorialListProps {
  filters: {
    category?: string;
    difficulty?: string;
    sortBy?: string;
    order?: string;
  };
}

const TutorialList: React.FC<TutorialListProps> = ({ filters }) => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTutorials = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
        if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
        if (filters.order) queryParams.append('order', filters.order);

        const response = await fetch(`/api/tutorials?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch tutorials: ${response.statusText}`);
        }
        const data = await response.json();
        setTutorials(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        console.error("Error fetching tutorials:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTutorials();
  }, [filters]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col space-y-3">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/4 mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500">Error loading tutorials: {error}</p>;
  }

  if (tutorials.length === 0) {
    return <p>No tutorials found matching your criteria.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tutorials.map(tutorial => (
        <TutorialCard key={tutorial.id} tutorial={tutorial} />
      ))}
    </div>
  );
};

export default TutorialList;
