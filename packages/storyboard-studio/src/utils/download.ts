// packages/storyboard-studio/src/utils/download.ts

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

/**
 * Triggers a browser download for the given storyboard package metadata as a JSON file.
 *
 * @param storyboardPackage The storyboard data to download.
 * @param fileName The desired name for the downloaded file (e.g., "storyboard-data.json").
 */
export const downloadStoryboardJson = (
  storyboardPackage: StoryboardPackage,
  fileName: string = `storyboard-${storyboardPackage.id || 'package'}.json`
): void => {
  if (!storyboardPackage) {
    console.error("No storyboard package data provided to download.");
    return;
  }

  try {
    const jsonString = JSON.stringify(storyboardPackage, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
    console.log(`Storyboard JSON download initiated: ${fileName}`);
  } catch (error) {
    console.error("Error preparing storyboard JSON for download:", error);
    alert("Failed to prepare storyboard data for download. See console for details.");
  }
};

/**
 * (Future) Triggers a browser download for the full storyboard package as a ZIP file.
 * This is a placeholder and would require a library like JSZip.
 *
 * @param storyboardPackage The storyboard data.
 * @param fileName The desired name for the ZIP file.
 */
export const downloadFullStoryboardZip = async (
  storyboardPackage: StoryboardPackage,
  fileName: string = `storyboard-${storyboardPackage.id || 'package'}-full.zip`
): Promise<void> => {
  console.warn(
    "downloadFullStoryboardZip is a placeholder. " +
    "Actual ZIP creation with images requires client-side fetching and a ZIP library (e.g., JSZip)."
  );
  alert(
    "Full ZIP download with images is not yet implemented. " +
    "For now, only the JSON metadata can be downloaded."
  );
  // Example of how it might start with JSZip (not functional without the library):
  // const JSZip = (await import('jszip')).default;
  // const zip = new JSZip();
  //
  // // 1. Add JSON metadata
  // const jsonString = JSON.stringify(storyboardPackage, null, 2);
  // zip.file("storyboard-data.json", jsonString);
  //
  // // 2. Fetch and add images (simplified example)
  // // This part is complex: needs to handle CORS, binary data, rate limits etc.
  // for (const panel of storyboardPackage.panels) {
  //   try {
  //     const response = await fetch(panel.imageURL); // Needs CORS if images are on different domain
  //     if (!response.ok) throw new Error(`Failed to fetch ${panel.imageURL}`);
  //     const imageBlob = await response.blob();
  //     zip.file(`panels/${panel.id}.${imageBlob.type.split('/')[1] || 'png'}`, imageBlob);
  //   } catch (err) {
  //     console.error(`Failed to fetch or add image ${panel.id} to ZIP:`, err);
  //   }
  // }
  //
  // // 3. Generate and trigger download
  // zip.generateAsync({ type:"blob" })
  //   .then(function(content) {
  //     const url = URL.createObjectURL(content);
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.download = fileName;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //     URL.revokeObjectURL(url);
  //   });

  // For now, just download the JSON as a fallback
  downloadStoryboardJson(storyboardPackage, `TEMP_JSON_ONLY_${fileName.replace('.zip', '.json')}`);
};
