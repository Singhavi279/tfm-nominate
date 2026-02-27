"use server";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, serverTimestamp, deleteDoc, Timestamp, writeBatch } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseConfig } from "@/firebase/config";

import {
  generateFormConfig,
  GenerateFormConfigInput,
} from "@/ai/flows/generate-form-config";
import { assistNominationText, AssistNominationTextInput } from "@/ai/flows/assist-nomination-text";
import { FormConfig, FormConfigSchema, Draft } from "@/lib/types";
import { revalidatePath } from "next/cache";

// Initialize Firebase for Server Actions
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);


// FORM CONFIG ACTIONS
export async function generateFormConfigAction(input: GenerateFormConfigInput) {
  try {
    const config = await generateFormConfig(input);
    const slug = config.categoryName.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-]+/g, "");
    return { config: { ...config, id: slug } };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function saveFormConfig(config: FormConfig) {
  try {
    const validatedConfig = FormConfigSchema.parse(config);
    const docRef = doc(db, "form_configurations", validatedConfig.id);
    await setDoc(docRef, validatedConfig);
    revalidatePath("/dashboard");
    return { id: validatedConfig.id };
  } catch (error: any) {
    if (error instanceof Error) return { error: error.message };
    return { error: "An unknown error occurred." };
  }
}

export async function getFormConfigs(): Promise<FormConfig[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "form_configurations"));
    return querySnapshot.docs.map((doc) => doc.data() as FormConfig);
  } catch (error) {
    console.error("Error fetching form configs:", error);
    return [];
  }
}

export async function getFormConfig(categoryId: string): Promise<FormConfig | null> {
  try {
    const docRef = doc(db, "form_configurations", categoryId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as FormConfig) : null;
  } catch (error) {
    console.error("Error fetching form config:", error);
    return null;
  }
}

// DRAFT ACTIONS
export async function getDraft(userId: string, categoryId: string): Promise<Draft | null> {
  const docRef = doc(db, "users", userId, "drafts", categoryId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  // Firestore Timestamps need to be converted for client-side use
  return {
    ...data,
    updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
  } as unknown as Draft;
}

export async function saveDraft(userId: string, categoryId: string, responses: any) {
  try {
    const docRef = doc(db, "users", userId, "drafts", categoryId);
    await setDoc(docRef, {
      userId,
      formConfigurationId: categoryId,
      formData: JSON.stringify(responses),
      lastSavedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true, updatedAt: new Date().toISOString() };
  } catch (error: any) {
    return { error: error.message };
  }
}

// SUBMISSION ACTIONS
export async function submitNomination(userId: string, categoryId: string, responses: any, files: { [key: string]: File }) {
  try {
    const attachmentUrls: { [key: string]: string } = {};

    // 1. Upload files to Cloud Storage
    for (const questionId in files) {
      const file = files[questionId];
      if (file) {
        const storageRef = ref(storage, `submissions/${userId}/${categoryId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        attachmentUrls[questionId] = downloadURL;
      }
    }

    const batch = writeBatch(db);

    // 2. Create submission document
    const submissionRef = doc(collection(db, "users", userId, "submissions"));
    batch.set(submissionRef, {
      userId,
      formConfigurationId: categoryId,
      submittedAt: serverTimestamp(),
      responses: JSON.stringify(responses),
      attachments: JSON.stringify(attachmentUrls),
    });
    
    // 3. Delete draft document
    const draftRef = doc(db, "users", userId, "drafts", categoryId);
    batch.delete(draftRef);

    // 4. Commit batch write
    await batch.commit();

    return { success: true, submissionId: submissionRef.id };
  } catch (error: any) {
    return { error: error.message };
  }
}

// AI ASSISTANT ACTION
export async function getAIAssistance(input: AssistNominationTextInput) {
  try {
    const result = await assistNominationText(input);
    return { suggestedText: result.suggestedText };
  } catch (error: any) {
    return { error: error.message };
  }
}
