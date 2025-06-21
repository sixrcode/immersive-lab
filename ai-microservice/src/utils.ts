import { Buffer } from 'buffer'; // Ensure Buffer is available in Node.js environment
import * as logger from 'firebase-functions/logger';

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
    logger.warn('Invalid data URI format', { dataUri });
    return null;
  }

  const [header, base64Data] = dataUri.split(',');
  if (!header || !base64Data) {
    logger.warn('Data URI missing header or data', { dataUri });
    return null;
  }

  const mimeMatch = header.match(/:(.*?);/);
  if (!mimeMatch || mimeMatch.length < 2) {
    logger.warn('Could not extract MIME type from data URI', { dataUriHeader: header });
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
      logger.warn(`Unsupported MIME type: ${mimeType}, attempting to derive extension.`, { mimeType });
      const typeParts = mimeType.split('/');
      if (typeParts.length === 2 && typeParts[1]) {
        extension = typeParts[1].split('+')[0]; // e.g. svg+xml -> svg
      } else {
        logger.warn(`Could not determine extension for MIME type: ${mimeType}`, { mimeType });
        return null; // Cannot determine a safe extension
      }
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    return { buffer, mimeType, extension };
  } catch (error) {
    logger.error('Error decoding base64 data from URI', { error, dataUri });
    return null;
  }
}
