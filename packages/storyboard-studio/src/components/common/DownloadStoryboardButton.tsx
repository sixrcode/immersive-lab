// packages/storyboard-studio/src/components/common/DownloadStoryboardButton.tsx
import React from 'react';
import { downloadStoryboardJson, downloadFullStoryboardZip } from '../../utils/download'; // Adjust path as needed

// Import StoryboardPackage type from @isl/types later
// import { StoryboardPackage } from '@isl/types';

// Temporary StoryboardPackage type
interface StoryboardPackage {
  id: string;
  title?: string;
  sceneDescription: string;
  panelCount: number;
  stylePreset?: string;
  referenceImageURL?: string;
  panels: any[]; // Replace 'any' with your Panel type
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

interface DownloadStoryboardButtonProps {
  storyboardPackage: StoryboardPackage | null;
  downloadType?: 'json' | 'zip'; // 'zip' is placeholder for now
  className?: string;
  buttonText?: string;
}

const DownloadStoryboardButton: React.FC<DownloadStoryboardButtonProps> = ({
  storyboardPackage,
  downloadType = 'json', // Default to JSON download
  className,
  buttonText,
}) => {
  const handleDownload = () => {
    if (!storyboardPackage) {
      alert('No storyboard data available to download.');
      return;
    }

    if (downloadType === 'zip') {
      // This will currently use the placeholder from download.ts
      downloadFullStoryboardZip(storyboardPackage);
    } else {
      downloadStoryboardJson(storyboardPackage);
    }
  };

  const defaultText = downloadType === 'zip' ? 'Download Full Package (ZIP)' : 'Download Metadata (JSON)';

  return (
    <button
      onClick={handleDownload}
      disabled={!storyboardPackage}
      className={className}
    >
      {buttonText || defaultText}
    </button>
  );
};

export default DownloadStoryboardButton;
