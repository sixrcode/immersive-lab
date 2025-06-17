// export interface DataUriParts { // TS Interface
//   mimeType: string;
//   buffer: Buffer;
//   extension: string;
// }

/**
 * Converts a data URI string to a Buffer and extracts MIME type and file extension.
 * @param dataUri The data URI string (e.g., "data:image/png;base64,iVBORw0KGgo...")
 * @returns An object containing the MIME type, Buffer, and file extension, or null if parsing fails.
 */
function dataUriToBuffer(dataUri /*: string */) /*: DataUriParts | null */ {
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

// Helper function to upload image buffer to Firebase Storage
async function uploadImageToStorage(
  buffer /*: Buffer */,
  mimeType /*: string */,
  extension /*: string */,
  userId /*: string */,
  promptPackageId /*: string */,
  fileNamePrefix /*: string */,
  storage /*: any */ // Added storage as a parameter
) /*: Promise<string> */ {
  if (!storage || !storage.bucket) {
    console.error('Firebase Storage is not initialized. Cannot upload image.');
    // Throw a specific error that the main handler can catch and convert to JSON
    throw new Error('StorageServiceNotAvailable: Firebase Storage is not initialized.');
  }
  try {
    const bucket = storage.bucket();
    const { v4: uuidv4 } = require('uuid'); // Import uuid dynamically
    const fileName = `${fileNamePrefix}-${uuidv4()}.${extension}`;
    // Use userId and promptPackageId for better organization in storage
    const filePath = `prototypes/${userId}/${promptPackageId}/${fileName}`;
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // A far-future expiration date for simplicity
    });
    return signedUrl;
  } catch (error: any) {
    console.error('Error during image upload to Firebase Storage:', error);
    throw new Error(`ImageUploadFailed: ${error.message}`); // Propagate a specific error
  }
}

module.exports = {
  dataUriToBuffer,
  uploadImageToStorage,
};
