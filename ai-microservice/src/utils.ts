import { Buffer } from 'buffer'; // Ensure Buffer is available in Node.js environment

export type DataUriParts = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

/**
 * Converts a data URI string into its components (Buffer, MIME type, extension).
 * @param dataUri The data URI string (e.g., "data:image/png;base64,iVBORw0KGgo...")
 * @returns An object with buffer, mimeType, and extension, or null if parsing fails.
 */
export function dataUriToBuffer(dataUri: string): DataUriParts | null {
  if (!dataUri || !dataUri.startsWith('data:')) {
    console.error('Invalid data URI format');
    return null;
  }

  const [header, base64Data] = dataUri.split(',');
  if (!header || !base64Data) {
    console.error('Data URI missing header or data');
    return null;
  }

  const mimeMatch = header.match(/:(.*?);/);
  if (!mimeMatch || mimeMatch.length < 2) {
    console.error('Could not extract MIME type from data URI');
    return null;
  }
  const mimeType = mimeMatch[1];

  let extension = '';
  switch (mimeType) {
    case 'image/png':
      extension = 'png';
      break;
    case 'image/jpeg':
      extension = 'jpg';
      break;
    case 'image/gif':
      extension = 'gif';
      break;
    case 'image/webp':
      extension = 'webp';
      break;
    case 'image/svg+xml':
      extension = 'svg';
      break;
    default:
      console.warn(`Unsupported MIME type: ${mimeType}, attempting to derive extension.`);
      const typeParts = mimeType.split('/');
      if (typeParts.length === 2 && typeParts[1]) {
        extension = typeParts[1].split('+')[0]; // e.g. svg+xml -> svg
      } else {
        console.error(`Could not determine extension for MIME type: ${mimeType}`);
        return null; // Cannot determine a safe extension
      }
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    return { buffer, mimeType, extension };
  } catch (error) {
    console.error('Error decoding base64 data from URI:', error);
    return null;
  }
}
