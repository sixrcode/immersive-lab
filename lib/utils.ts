import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface DataUriParts {
  mimeType: string;
  buffer: Buffer;
  extension: string;
}

/**
 * Converts a data URI string to a Buffer and extracts MIME type and file extension.
 * @param dataUri The data URI string (e.g., "data:image/png;base64,iVBORw0KGgo...")
 * @returns An object containing the MIME type, Buffer, and file extension, or null if parsing fails.
 */
export function dataUriToBuffer(dataUri: string): DataUriParts | null {
  if (!dataUri || !dataUri.startsWith('data:')) {
    console.error('Invalid data URI:', dataUri);
    return null;
  }

  const [header, base64Data] = dataUri.split(',');
  if (!header || !base64Data) {
    console.error('Malformed data URI: could not split header and data');
    return null;
  }

  const mimeMatch = header.match(/:(.*?);/);
  if (!mimeMatch || mimeMatch.length < 2) {
    console.error('Malformed data URI: could not extract MIME type from header:', header);
    return null;
  }
  const mimeType = mimeMatch[1];

  // Determine file extension from MIME type
  // This is a basic list, more comprehensive mapping might be needed for other types
  let extension = '';
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      extension = 'jpg';
      break;
    case 'image/png':
      extension = 'png';
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
    // Add more MIME types and their extensions as needed
    default:
      // Try to get the part after '/' as a fallback
      const genericExtension = mimeType.split('/')[1];
      if (genericExtension) {
        extension = genericExtension.split('+')[0]; // Handles cases like svg+xml
      } else {
        console.warn('Could not determine file extension for MIME type:', mimeType);
        extension = 'bin'; // Default to binary if unknown
      }
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    return { mimeType, buffer, extension };
  } catch (error) {
    console.error('Error converting base64 to Buffer:', error);
    return null;
  }
}
