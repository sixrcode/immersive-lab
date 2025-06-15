// packages/storyboard-studio/src/components/scene-input/SceneInputForm.tsx
import React, { useState } from 'react';
// We'll import GenerateStoryboardProps later when types are more broadly available
// import { GenerateStoryboardProps } from '@isl/types'; // Assuming path alias or direct import

interface SceneInputFormProps {
  onSubmit: (data: any /* Replace with GenerateStoryboardProps later */) => void;
  isLoading?: boolean;
}

const SceneInputForm: React.FC<SceneInputFormProps> = ({ onSubmit, isLoading }) => {
  const [sceneDescription, setSceneDescription] = useState('');
  const [panelCount, setPanelCount] = useState<number>(2); // Default to 2 panels
  const [stylePreset, setStylePreset] = useState<string>('');
  // const [referenceImage, setReferenceImage] = useState<File | null>(null); // For file uploads

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Basic validation (can be expanded)
    if (!sceneDescription.trim()) {
      alert('Please enter a scene description.');
      return;
    }
    if (panelCount < 2 || panelCount > 10) {
      alert('Panel count must be between 2 and 10.');
      return;
    }
    onSubmit({ sceneDescription, panelCount, stylePreset /* referenceImage */ });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="sceneDescription">Scene Description:</label>
        <textarea
          id="sceneDescription"
          value={sceneDescription}
          onChange={(e) => setSceneDescription(e.target.value)}
          rows={5}
          required
        />
      </div>
      <div>
        <label htmlFor="panelCount">Panel Count (2-10):</label>
        <input
          type="number"
          id="panelCount"
          value={panelCount}
          onChange={(e) => setPanelCount(parseInt(e.target.value, 10))}
          min="2"
          max="10"
          required
        />
      </div>
      <div>
        <label htmlFor="stylePreset">Style Preset (e.g., cinematic, anime, comic):</label>
        <input
          type="text"
          id="stylePreset"
          value={stylePreset}
          onChange={(e) => setStylePreset(e.target.value)}
          placeholder="e.g., cinematic, anime"
        />
      </div>
      {/* <div>
        <label htmlFor="referenceImage">Reference Image (Optional):</label>
        <input
          type="file"
          id="referenceImage"
          accept="image/*"
          onChange={(e) => setReferenceImage(e.target.files ? e.target.files[0] : null)}
        />
      </div> */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate Storyboard'}
      </button>
    </form>
  );
};

export default SceneInputForm;
