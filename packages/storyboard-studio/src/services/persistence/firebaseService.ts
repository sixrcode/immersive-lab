// packages/storyboard-studio/src/services/persistence/firebaseService.ts

import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, Firestore, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, Storage, deleteObject, uploadString } from 'firebase/storage';

import {
  StoryboardPackage,
  Panel
} from '../../../../types/src/storyboard.types'; // Adjust path as necessary

// Mock Firebase config - replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

let app: FirebaseApp;
let db: Firestore;
let storage: Storage;

try {
  app = getApp();
} catch (e) {
  app = initializeApp(firebaseConfig);
}

db = getFirestore(app);
storage = getStorage(app);

console.log("Firebase services initialized.");

/**
 * Simulates uploading a file (as a Blob or File) to Firebase Storage.
 * In a real scenario, this would take a File or Blob object.
 * For this mock, we'll assume it's a base64 string or a dummy buffer.
 *
 * @param fileBuffer The file content (e.g., from a canvas.toDataURL())
 * @param path The desired path in Firebase Storage (e.g., `storyboards/{storyboardId}/panels/{panelId}.png`)
 * @returns A Promise that resolves to the download URL of the uploaded file.
 */
export const uploadImageToStorage = async (
  fileBuffer: string | ArrayBuffer | Blob,
  path: string
): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    let uploadResult;

    if (typeof fileBuffer === 'string') {
      // Assume base64 data URI: "data:image/png;base64,iVBORw0KGgo..."
      // Firebase's uploadString can handle 'data_url' format directly
      uploadResult = await uploadString(storageRef, fileBuffer, 'data_url');
    } else if (fileBuffer instanceof ArrayBuffer || fileBuffer instanceof Blob) {
      uploadResult = await uploadBytes(storageRef, fileBuffer);
    } else {
      throw new Error('Invalid fileBuffer type. Must be base64 string, ArrayBuffer, or Blob.');
    }

    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log(`Image uploaded to Firebase Storage at path: ${path}, URL: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to Firebase Storage:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

/**
 * Fetches all StoryboardPackages from Firestore for a given project ID.
 *
 * @param projectId The ID of the project whose storyboards to fetch.
 * @returns A Promise that resolves to an array of StoryboardPackages or null/empty array if none are found.
 */
export const getStoryboardsByProjectIdFromFirestore = async (
  projectId: string
): Promise<StoryboardPackage[] | null> => {
  console.log(`Fetching storyboards for project ID: ${projectId} from Firestore.`);
  try {
    const storyboardsRef = collection(db, 'storyboards');
    const q = query(storyboardsRef, where('projectId', '==', projectId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`No storyboards found for project ID: ${projectId}`);
      return []; // Return empty array if no storyboards are found
    }

    const storyboards: StoryboardPackage[] = [];
    querySnapshot.forEach((doc) => {
      storyboards.push(doc.data() as StoryboardPackage);
    });

    console.log(`Successfully fetched ${storyboards.length} storyboards for project ID: ${projectId}`);
    return storyboards;
  } catch (error) {
    console.error(`Error fetching storyboards for project ID ${projectId} from Firestore:`, error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

/**
 * Deletes a storyboard and its associated images from Firebase.
 *
 * @param storyboardId The ID of the storyboard to delete.
 * @param panelIds An array of panel IDs associated with the storyboard.
 *                 This is a simplified approach. Ideally, the function would fetch the storyboard
 *                 to get panel details if not all image paths are derivable or provided.
 * @returns A Promise that resolves when the storyboard and its images are deleted.
 */
export const deleteStoryboardFromFirestore = async (
  storyboardId: string,
  panelIds: string[] // Simplified for this subtask
): Promise<void> => {
  console.log(`Attempting to delete storyboard ID: ${storyboardId} and its associated images.`);

  try {
    // Fetch the storyboard to get panel details for image deletion
    // This is a more robust approach than relying on panelIds argument alone,
    // especially if image paths are stored within the panel data.
    const storyboard = await getStoryboardFromFirestore(storyboardId);
    if (!storyboard) {
      console.warn(`Storyboard with ID: ${storyboardId} not found. Nothing to delete.`);
      return;
    }

    // 1. Delete images from Firebase Storage
    // Assuming panel objects have an 'id' and potentially 'imageURL' or 'previewURL'
    // For this example, we'll construct paths based on convention.
    // A more robust solution would be to store full paths or use a naming convention.
    const imageDeletePromises: Promise<void>[] = [];

    storyboard.panels.forEach((panel: Panel) => { // Assuming StoryboardPackage has a panels array
      // Example paths, adjust if your structure is different
      const imagePath = `storyboards/${storyboardId}/panels/${panel.id}/image.png`; // Or panel.imageURL
      const previewPath = `storyboards/${storyboardId}/panels/${panel.id}/preview.webp`; // Or panel.previewURL

      const imageRef = ref(storage, imagePath);
      imageDeletePromises.push(deleteObject(imageRef).catch(err => {
        // Log error but continue, some images might not exist or path is wrong
        console.warn(`Failed to delete image ${imagePath}: ${err.message}. It might not exist.`);
      }));

      const previewRef = ref(storage, previewPath);
      imageDeletePromises.push(deleteObject(previewRef).catch(err => {
        console.warn(`Failed to delete image ${previewPath}: ${err.message}. It might not exist.`);
      }));
    });

    await Promise.all(imageDeletePromises);
    console.log(`Successfully deleted associated images from Storage for storyboard ID: ${storyboardId}.`);

    // 2. Delete the StoryboardPackage document from Firestore
    const docPath = `storyboards/${storyboardId}`;
    const docRef = doc(db, docPath);
    await deleteDoc(docRef);
    console.log(`Successfully deleted storyboard document from Firestore for ID: ${storyboardId}.`);

  } catch (error) {
    console.error(`Error deleting storyboard ID: ${storyboardId}:`, error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

/**
 * Fetches all StoryboardPackages from Firestore for a given user ID.
 *
 * @param userId The ID of the user whose storyboards to fetch.
 * @returns A Promise that resolves to an array of StoryboardPackages or null/empty array if none are found.
 */
export const getStoryboardsByUserIdFromFirestore = async (
  userId: string
): Promise<StoryboardPackage[] | null> => {
  console.log(`Fetching storyboards for user ID: ${userId} from Firestore.`);
  try {
    const storyboardsRef = collection(db, 'storyboards');
    const q = query(storyboardsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`No storyboards found for user ID: ${userId}`);
      return []; // Return empty array if no storyboards are found
    }

    const storyboards: StoryboardPackage[] = [];
    querySnapshot.forEach((doc) => {
      storyboards.push(doc.data() as StoryboardPackage);
    });

    console.log(`Successfully fetched ${storyboards.length} storyboards for user ID: ${userId}`);
    return storyboards;
  } catch (error) {
    console.error(`Error fetching storyboards for user ID ${userId} from Firestore:`, error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

/**
 * Simulates saving StoryboardPackage metadata to Firestore.
 *
 * @param storyboardPackage The StoryboardPackage object to save.
 * @returns A Promise that resolves when the data is saved.
 */
export const saveStoryboardToFirestore = async (
  storyboardPackage: StoryboardPackage
): Promise<void> => {
  if (!storyboardPackage.id) {
    console.error("StoryboardPackage must have an ID to be saved.");
    throw new Error("StoryboardPackage must have an ID to be saved.");
  }
  const docPath = `storyboards/${storyboardPackage.id}`;
  console.log(`Saving storyboard metadata to Firestore at path: ${docPath}`, storyboardPackage);
  try {
    const docRef = doc(db, docPath);
    await setDoc(docRef, storyboardPackage);
    console.log(`Storyboard saved successfully to Firestore with ID: ${storyboardPackage.id}`);
  } catch (error) {
    console.error("Error saving storyboard to Firestore:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

/**
 * Simulates fetching a StoryboardPackage from Firestore.
 *
 * @param storyboardId The ID of the storyboard to fetch.
 * @returns A Promise that resolves to the StoryboardPackage or null if not found.
 */
export const getStoryboardFromFirestore = async (
  storyboardId: string
): Promise<StoryboardPackage | null> => {
  const docPath = `storyboards/${storyboardId}`;
  console.log(`Fetching storyboard metadata from Firestore at path: ${docPath}`);
  try {
    const docRef = doc(db, docPath);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log(`Storyboard fetched successfully from Firestore with ID: ${storyboardId}`);
      return docSnap.data() as StoryboardPackage;
    } else {
      console.log(`No storyboard found in Firestore with ID: ${storyboardId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching storyboard from Firestore:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};
