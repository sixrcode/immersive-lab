// packages/storyboard-studio/src/components/viewer/StoryboardGridView.tsx
import React from 'react';
import StoryboardGridPanel from './StoryboardGridPanel';
// Import StoryboardPackage and Panel types from @isl/types later
// import { StoryboardPackage, Panel } from '@isl/types';

// Temporary types
interface Panel {
  id: string;
  previewURL: string;
  alt: string;
  caption?: string;
}
interface StoryboardPackage {
  id: string;
  title?: string;
  panels: Panel[];
}


interface StoryboardGridViewProps {
  storyboard: StoryboardPackage | null;
  onSelectPanel: (panelId: string) => void;
  onRegeneratePanel?: (panelId: string) => void; // Optional
  isLoading?: boolean;
  error?: string | null;
}

const StoryboardGridView: React.FC<StoryboardGridViewProps> = ({
  storyboard,
  onSelectPanel,
  onRegeneratePanel,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return <div>Loading storyboard grid...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error loading storyboard: {error}</div>;
  }

  if (!storyboard || storyboard.panels.length === 0) {
    return <div>No panels to display. Generate a storyboard to see it here.</div>;
  }

  return (
    <div className="storyboard-grid-view" style={{ display: 'flex', flexWrap: 'wrap', padding: '10px' }}>
      {storyboard.panels.map((panel) => (
        <StoryboardGridPanel
          key={panel.id}
          panel={panel}
          onSelectPanel={onSelectPanel}
          onRegeneratePanel={onRegeneratePanel}
        />
      ))}
    </div>
  );
};

export default StoryboardGridView;
