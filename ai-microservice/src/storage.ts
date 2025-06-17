import admin from 'firebase-admin'; // Assuming admin is initialized elsewhere (e.g., index.js)
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads an image buffer to Firebase Storage.
 *
 * @param buffer The image data as a Buffer.
 * @param mimeType The MIME type of the image (e.g., "image/png").
 * @param extension The file extension for the image (e.g., "png").
 * @param userId The ID of the user uploading the image.
 * @param packageId A unique identifier for the related package (e.g., promptPackageId, storyboardId).
 * @param fileNamePrefix A prefix for the file name (e.g., "moodboard_input", "panel_").
 * @returns A Promise that resolves to the public URL of the uploaded image.
 * @throws Will throw an error if the upload fails.
 */
export async function uploadImageToStorage(
  buffer: Buffer,
  mimeType: string,
  extension: string,
  userId: string,
  packageId: string,
  fileNamePrefix: string
): Promise<string> {
  const bucket = admin.storage().bucket(); // Default bucket
  const fileName = `${userId}/${packageId}/${fileNamePrefix}${uuidv4()}.${extension}`;
  const file = bucket.file(fileName);

  try {
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
      public: true, // Make the file publicly readable
    });

    // Public URL format for Firebase Storage (version 4 UUIDs are used for resumable uploads, not directly in public URLs this way)
    // The public URL is typically: `https://storage.googleapis.com/[BUCKET_NAME]/[OBJECT_NAME]`
    // Or, if using Firebase's shorter links through the SDK, it might look different or require getSignedUrl.
    // For simple public access, `file.publicUrl()` is the most straightforward if the object is public.

    // Note: file.publicUrl() is often the simplest way if ACLs are set to public.
    // However, for more robust applications, especially if files are not public by default,
    // getSignedUrl is preferred. For now, assuming public access is enabled on save.
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    console.log(`Image uploaded to ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error(`Failed to upload image to Firebase Storage at ${fileName}`, error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}
