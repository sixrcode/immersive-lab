// packages/storyboard-studio/src/components/viewer/StoryboardFullscreenView.tsx
import React from 'react';
// Import Panel type from @isl/types later
// import { Panel } from '@isl/types';

// Temporary Panel type
interface Panel {
  id: string;
  imageURL: string; // Use full imageURL here
  alt: string;
  caption?: string;
  camera?: string;
  durationMs?: number;
  // Add other relevant fields
}

interface StoryboardFullscreenViewProps {
  panel: Panel | null;
  onClose: () => void;
  onRegenerate?: (panelId: string) => void; // Optional for regenerating the currently viewed panel
  onNavigate?: (direction: 'prev' | 'next') => void; // Optional
}

const StoryboardFullscreenView: React.FC<StoryboardFullscreenViewProps> = ({
  panel,
  onClose,
  onRegenerate,
  onNavigate,
}) => {
  if (!panel) {
    return null; // Or some minimal UI indicating nothing is selected
  }

  return (
    <div
      className="storyboard-fullscreen-view"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        color: 'white',
      }}
    >
      <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '1.5em' }}>
        &times; Close
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '90%', marginBottom: '10px' }}>
        {onNavigate && <button onClick={() => onNavigate('prev')} style={{fontSize: '2em'}}>&lt;</button>}
        <img
          src={panel.imageURL}
          alt={panel.alt}
          style={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain' }}
        />
        {onNavigate && <button onClick={() => onNavigate('next')} style={{fontSize: '2em'}}>&gt;</button>}
      </div>

      <h3>{panel.caption || 'Panel Details'}</h3>
      <p><strong>ID:</strong> {panel.id}</p>
      {panel.camera && <p><strong>Camera:</strong> {panel.camera}</p>}
      {panel.durationMs && <p><strong>Duration:</strong> {panel.durationMs}ms</p>}

      {onRegenerate && (
        <button onClick={() => onRegenerate(panel.id)} style={{ marginTop: '10px' }}>
          Regenerate This Panel
        </button>
      )}
    </div>
  );
};

export default StoryboardFullscreenView;
