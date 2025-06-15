// packages/storyboard-studio/src/components/viewer/StoryboardGridPanel.tsx
import React from 'react';
// Import Panel type from @isl/types later
// import { Panel } from '@isl/types';

// Temporary Panel type
interface Panel {
  id: string;
  previewURL: string;
  alt: string;
  caption?: string;
  // Add other relevant fields from your actual Panel type
}

interface StoryboardGridPanelProps {
  panel: Panel;
  onSelectPanel: (panelId: string) => void;
  onRegeneratePanel?: (panelId: string) => void; // Optional
}

const StoryboardGridPanel: React.FC<StoryboardGridPanelProps> = ({
  panel,
  onSelectPanel,
  onRegeneratePanel,
}) => {
  return (
    <div className="storyboard-grid-panel" onClick={() => onSelectPanel(panel.id)} style={{ border: '1px solid #ccc', margin: '8px', padding: '8px', cursor: 'pointer' }}>
      <img src={panel.previewURL} alt={panel.alt} style={{ maxWidth: '200px', maxHeight: '150px', display: 'block' }} />
      <p style={{ fontSize: '0.9em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {panel.caption || panel.alt}
      </p>
      {onRegeneratePanel && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent onSelectPanel from firing
            onRegeneratePanel(panel.id);
          }}
          style={{ marginTop: '4px', fontSize: '0.8em' }}
        >
          Regenerate
        </button>
      )}
    </div>
  );
};

export default StoryboardGridPanel;
