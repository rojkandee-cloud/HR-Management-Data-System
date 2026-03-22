
import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  Firestore, 
  enableIndexedDbPersistence 
} from "firebase/firestore";
import { FirestoreDoc } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyBFJcwXWcw1KGHlXMKaHOuJBs97eaReFGA",
  authDomain: "whydoesit-6a69e.firebaseapp.com",
  projectId: "whydoesit-6a69e",
  storageBucket: "whydoesit-6a69e.firebasestorage.app",
  messagingSenderId: "557589087320",
  appId: "1:557589087320:web:17b6268c535bd2eea1f62d"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with enhanced connectivity settings
// Note: experimentalForceLongPolling and experimentalAutoDetectLongPolling cannot be used together.
// We prioritize ForceLongPolling for maximum compatibility in restricted networks.
const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
});

// Enable Offline Persistence to handle connectivity errors gracefully
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time.
    console.warn("Firestore persistence failed: Multiple tabs open.");
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn("Firestore persistence is not supported by this browser.");
  }
});

export const fetchCollectionData = async (collectionName: string): Promise<FirestoreDoc[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const docs: FirestoreDoc[] = [];
    querySnapshot.forEach((doc) => {
      docs.push({
        ...doc.data(),
        id: doc.id
      });
    });
    return docs;
  } catch (error: any) {
    console.error(`Error fetching collection ${collectionName}: `, error);
    // Return empty array on failure instead of crashing, allowing offline mode to potentially show cached data
    return [];
  }
};

export const fetchAllSpecifiedCollections = async (collectionNames: string[]): Promise<Record<string, FirestoreDoc[]>> => {
  const results: Record<string, FirestoreDoc[]> = {};
  try {
    const promises = collectionNames.map(async (name) => {
      try {
        const docs = await fetchCollectionData(name);
        results[name] = docs;
      } catch (e) {
        results[name] = [];
      }
    });
    await Promise.all(promises);
    return results;
  } catch (error) {
    console.error("Error fetching all collections:", error);
    return results;
  }
};

export const getSingleDocument = async (collectionName: string, docId: string): Promise<FirestoreDoc | null> => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error getting document ${docId} from ${collectionName}:`, error);
    return null;
  }
};

export const getDocumentsByField = async (collectionName: string, field: string, value: string): Promise<FirestoreDoc[]> => {
  try {
    const q = query(collection(db, collectionName), where(field, "==", value));
    const querySnapshot = await getDocs(q);
    const docs: FirestoreDoc[] = [];
    querySnapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  } catch (error) {
    console.error(`Error querying ${collectionName} by ${field}:`, error);
    return [];
  }
};

export const addDocumentToCollection = async (collectionName: string, data: any): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

export const setDocumentWithId = async (collectionName: string, docId: string, data: any): Promise<void> => {
  try {
    await setDoc(doc(db, collectionName, docId), data);
  } catch (error) {
    console.error(`Error setting document ${docId} in ${collectionName}:`, error);
    throw error;
  }
};

export const updateDocument = async (collectionName: string, docId: string, data: any): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Update failed for ${docId} in ${collectionName}:`, error);
    throw error;
  }
};

export const deleteDocumentFromCollection = async (collectionName: string, docId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    console.error(`Delete failed for ${docId} in ${collectionName}:`, error);
    throw error;
  }
};

export { db };
