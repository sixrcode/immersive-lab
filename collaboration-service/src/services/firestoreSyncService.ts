// collaboration-service/src/services/firestoreSyncService.ts
import { db, storage } from '../firebaseAdmin'; // Import db and storage from the new setup
import logger from '../logger'; // Import logger

// Placeholder for StoryboardPackage and Panel types.
// In a real scenario, these would be shared types, e.g., from a `packages/types`
interface Panel {
  id: string;
  imageURL?: string; // Assuming imageURL might be stored
  // other panel properties
}

interface StoryboardPackage {
  id: string;
  projectId: string;
  projectName?: string; // Added or ensure this field exists for project name
  panels: Panel[];
  // other storyboard properties
}

interface ProjectId {
  projectId: string;
}

interface ProjectRenamePayload {
  projectId: string;
  newName: string;
}

// Add this function inside firestoreSyncService.ts
async function getStoryboardsByProjectId(projectId: string): Promise<StoryboardPackage[]> {
  logger.info(`[FirestoreSyncService] Fetching storyboards for project ID: ${projectId}`, { projectId });
  try {
    const storyboardsRef = db.collection('storyboards');
    const q = storyboardsRef.where('projectId', '==', projectId);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      logger.info(`[FirestoreSyncService] No storyboards found for project ID: ${projectId}`, { projectId });
      return [];
    }

    const storyboards: StoryboardPackage[] = [];
    querySnapshot.forEach(doc => {
      storyboards.push({ id: doc.id, ...doc.data() } as StoryboardPackage);
    });
    logger.info(`[FirestoreSyncService] Successfully fetched ${storyboards.length} storyboards for project ID: ${projectId}`, { projectId, count: storyboards.length });
    return storyboards;
  } catch (error) {
    logger.error(`[FirestoreSyncService] Error fetching storyboards for project ID ${projectId}`, { error, projectId });
    throw error;
  }
}

// Add this function inside firestoreSyncService.ts
async function deleteStoryboard(storyboard: StoryboardPackage): Promise<void> {
  logger.info(`[FirestoreSyncService] Attempting to delete storyboard ID: ${storyboard.id}`, { storyboardId: storyboard.id });
  try {
    // 1. Delete images from Firebase Storage
    const imageDeletePromises: Promise<any>[] = [];
    storyboard.panels.forEach(panel => {
      if (panel.imageURL) {
        try {
          // Extract path from URL: https://firebasestorage.googleapis.com/v0/b/your-bucket/o/path%2Fto%2Fimage.png?alt=media
          const decodedUrl = decodeURIComponent(panel.imageURL);
          const pathRegex = /o\/(.*?)\?alt=media/;
          const match = decodedUrl.match(pathRegex);
          if (match && match[1]) {
            const imagePath = match[1];
             // Check if storage bucket is available
            if (storage.bucket().name) {
                const fileRef = storage.bucket().file(imagePath);
                imageDeletePromises.push(fileRef.delete().catch(err => {
                logger.warn(`[FirestoreSyncService] Failed to delete image ${imagePath} from Storage: ${err.message}. It might not exist or permissions are missing.`, { imagePath, storyboardId: storyboard.id, panelId: panel.id });
                }));
            } else {
                logger.warn(`[FirestoreSyncService] Storage bucket not available, skipping deletion of image ${imagePath}. Ensure Admin SDK is initialized with a bucket.`, { imagePath, storyboardId: storyboard.id });
            }

          } else {
            logger.warn(`[FirestoreSyncService] Could not extract path from imageURL: ${panel.imageURL} for panel ${panel.id}`, { imageUrl: panel.imageURL, panelId: panel.id, storyboardId: storyboard.id });
          }
        } catch (e) {
            logger.warn(`[FirestoreSyncService] Error processing imageURL ${panel.imageURL} for deletion: `, { error: e, imageUrl: panel.imageURL, storyboardId: storyboard.id });
        }
      }
      // Add logic for other images like 'previewURL' if necessary
    });

    await Promise.all(imageDeletePromises);
    logger.info(`[FirestoreSyncService] Finished attempting to delete associated images from Storage for storyboard ID: ${storyboard.id}.`, { storyboardId: storyboard.id });

    // 2. Delete the StoryboardPackage document from Firestore
    const docRef = db.collection('storyboards').doc(storyboard.id);
    await docRef.delete();
    logger.info(`[FirestoreSyncService] Successfully deleted storyboard document from Firestore for ID: ${storyboard.id}.`, { storyboardId: storyboard.id });

  } catch (error) {
    logger.error(`[FirestoreSyncService] Error deleting storyboard ID: ${storyboard.id}`, { error, storyboardId: storyboard.id });
    throw error;
  }
}

/**
 * Handles the event when a project is deleted.
 * This function will be responsible for:
 * - Finding all storyboards linked to the projectId in Firestore.
 * - Deleting those storyboards and their associated images.
 * - Handling deletion of other project-linked data in Firestore (e.g., prototypes).
 */
export const handleProjectDeleted = async ({ projectId }: ProjectId): Promise<void> => {
  logger.info(`[FirestoreSyncService] Received project deleted event for projectId: ${projectId}`, { projectId });
  try {
    const storyboards = await getStoryboardsByProjectId(projectId);
    if (storyboards.length === 0) {
      logger.info(`[FirestoreSyncService] No storyboards to delete for project ${projectId}.`, { projectId });
      return;
    }

    logger.info(`[FirestoreSyncService] Deleting ${storyboards.length} storyboard(s) for project ${projectId}...`, { projectId, count: storyboards.length });
    for (const storyboard of storyboards) {
      await deleteStoryboard(storyboard);
    }
    logger.info(`[FirestoreSyncService] Successfully processed deletion for project ${projectId}.`, { projectId });

    // TODO: Handle deletion of other project-linked data in Firestore (e.g., prototypes).
    // For now, this is a placeholder.
    logger.info(`[FirestoreSyncService] Placeholder for deleting other Firestore data (e.g., prototypes) related to project ${projectId}.`, { projectId });

  } catch (error) {
    logger.error(`[FirestoreSyncService] Error in handleProjectDeleted for projectId ${projectId}`, { error, projectId });
    // Decide on error handling strategy (e.g., retry, log to monitoring)
  }
};

/**
 * Handles the event when a project is renamed.
 * This function will be responsible for:
 * - Finding all storyboard documents linked to the projectId in Firestore.
 * - Updating the project name in each of these Firestore documents.
 * - Updating other project-linked data in Firestore if any.
 */
export const handleProjectRenamed = async ({ projectId, newName }: ProjectRenamePayload): Promise<void> => {
  logger.info(`[FirestoreSyncService] Received project renamed event for projectId: ${projectId}, newName: ${newName}`, { projectId, newName });
  try {
    const storyboards = await getStoryboardsByProjectId(projectId); // Assuming getStoryboardsByProjectId is available

    if (storyboards.length === 0) {
      logger.info(`[FirestoreSyncService] No storyboards found for project ${projectId} to update name.`, { projectId });
      return;
    }

    logger.info(`[FirestoreSyncService] Updating project name to "${newName}" for ${storyboards.length} storyboard(s) linked to project ${projectId}...`, { projectId, newName, count: storyboards.length });

    const updatePromises: Promise<void>[] = [];
    for (const storyboard of storyboards) {
      const storyboardRef = db.collection('storyboards').doc(storyboard.id);
      // Assuming the field to update in Firestore is 'projectName'
      updatePromises.push(
        storyboardRef.update({ projectName: newName })
          .then(() => {
            logger.info(`[FirestoreSyncService] Successfully updated project name for storyboard ${storyboard.id}`, { storyboardId: storyboard.id, projectId, newName });
          })
          .catch(err => {
            logger.error(`[FirestoreSyncService] Failed to update project name for storyboard ${storyboard.id}`, { error: err, storyboardId: storyboard.id, projectId, newName });
            // Optionally, collect errors instead of just logging, to decide if the whole process failed
          })
      );
    }

    await Promise.all(updatePromises);
    logger.info(`[FirestoreSyncService] Successfully processed rename for project ${projectId}. All relevant storyboards updated.`, { projectId, newName });

    // TODO: Implement update for other project-linked data in Firestore (e.g., prototypes)
    logger.info(`[FirestoreSyncService] Placeholder for updating other Firestore data (e.g., prototypes) related to project rename for ${projectId}.`, { projectId });

  } catch (error) {
    logger.error(`[FirestoreSyncService] Error in handleProjectRenamed for projectId ${projectId}`, { error, projectId, newName });
    // Decide on error handling strategy
  }
};
