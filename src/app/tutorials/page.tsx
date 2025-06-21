'use client';

import React, { useState, useCallback } from 'react';
import TutorialList from '@/components/tutorials/TutorialList';
import TutorialFilters from '@/components/tutorials/TutorialFilters';

interface ActiveFilters {
  category?: string;
  difficulty?: string;
  sortBy?: string;
  order?: string;
}

const TutorialsPage: React.FC = () => {
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    sortBy: 'publishDate', // Default sort: Newest first
    order: 'desc',
  });

  const handleFilterChange = useCallback((newFilters: ActiveFilters) => {
    setActiveFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-center">Tutorial Discovery Engine</h1>
        <p className="text-xl text-muted-foreground text-center mt-2">
          Find tutorials to level up your skills in VR, XR, AI Filmmaking, and more.
        </p>
      </header>

      <TutorialFilters
        currentFilters={activeFilters}
        onFilterChange={handleFilterChange}
      />

      <TutorialList filters={activeFilters} />
    </div>
  );
};

export default TutorialsPage;
