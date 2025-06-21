'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tutorial } from 'packages/types/src/tutorial.types'; // For Category and Difficulty types

// Define available options based on Tutorial type or common knowledge
const categories: Tutorial['category'][] = ['VR', 'XR', 'AI Filmmaking', 'Open Source Creative Tools', 'Other'];
const difficulties: Tutorial['difficulty'][] = ['Beginner', 'Intermediate', 'Advanced'];
const sortOptions = [
  { value: 'publishDate-desc', label: 'Newest First' },
  { value: 'publishDate-asc', label: 'Oldest First' },
  { value: 'popularity-desc', label: 'Most Popular' },
  { value: 'popularity-asc', label: 'Least Popular' },
  { value: 'title-asc', label: 'Title (A-Z)' },
  { value: 'title-desc', label: 'Title (Z-A)' },
];

interface TutorialFiltersProps {
  currentFilters: {
    category?: string;
    difficulty?: string;
    sortBy?: string;
    order?: string;
  };
  onFilterChange: (newFilters: { category?: string; difficulty?: string; sortBy?: string; order?: string }) => void;
}

const TutorialFilters: React.FC<TutorialFiltersProps> = ({ currentFilters, onFilterChange }) => {
  const handleCategoryChange = (value: string) => {
    onFilterChange({ ...currentFilters, category: value === 'all' ? undefined : value });
  };

  const handleDifficultyChange = (value: string) => {
    onFilterChange({ ...currentFilters, difficulty: value === 'all' ? undefined : value });
  };

  const handleSortChange = (value: string) => {
    if (value === 'all') {
        onFilterChange({ ...currentFilters, sortBy: undefined, order: undefined });
    } else {
        const [sortBy, order] = value.split('-');
        onFilterChange({ ...currentFilters, sortBy, order });
    }
  };

  const currentSortValue = currentFilters.sortBy && currentFilters.order ? `${currentFilters.sortBy}-${currentFilters.order}` : 'all';

  return (
    <div className="mb-8 p-4 border rounded-lg bg-card text-card-foreground">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <Label htmlFor="category-filter" className="mb-2 block">Category</Label>
          <Select onValueChange={handleCategoryChange} value={currentFilters.category || 'all'}>
            <SelectTrigger id="category-filter">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="difficulty-filter" className="mb-2 block">Difficulty</Label>
          <Select onValueChange={handleDifficultyChange} value={currentFilters.difficulty || 'all'}>
            <SelectTrigger id="difficulty-filter">
              <SelectValue placeholder="Filter by difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              {difficulties.map(diff => (
                <SelectItem key={diff} value={diff}>{diff}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sort-by" className="mb-2 block">Sort By</Label>
          <Select onValueChange={handleSortChange} value={currentSortValue}>
            <SelectTrigger id="sort-by">
              <SelectValue placeholder="Sort tutorials" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Default</SelectItem>
              {sortOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default TutorialFilters;
