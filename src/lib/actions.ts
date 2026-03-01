
"use server";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, collectionGroup, where } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

import {
  generateFormConfig,
} from "@/ai/flows/generate-form-config";
import { assistNominationText, AssistNominationTextInput } from "@/ai/flows/assist-nomination-text";
import { FormConfig, FormConfigSchema } from "@/lib/types";
import { revalidatePath } from "next/cache";

// Initialize Firebase for Server Actions
function getDb() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return getFirestore(app);
}


// FORM CONFIG ACTIONS
export async function generateFormConfigAction(input: any) {
  try {
    const config = await generateFormConfig(input);
    const slug = config.categoryName.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-]+/g, "");
    return { config: { ...config, id: slug } };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function saveFormConfig(config: FormConfig) {
  const db = getDb();
  try {
    const validatedConfig = FormConfigSchema.parse(config);
    const docRef = doc(db, "form_configurations", validatedConfig.id);
    await setDoc(docRef, validatedConfig);
    revalidatePath("/dashboard");
    revalidatePath("/admin/upload");
    return { id: validatedConfig.id };
  } catch (error: any) {
    if (error instanceof Error) return { error: error.message };
    return { error: "An unknown error occurred." };
  }
}

export async function getFormConfigs(): Promise<FormConfig[]> {
  const db = getDb();
  try {
    const querySnapshot = await getDocs(collection(db, "form_configurations"));
    return querySnapshot.docs.map((doc) => doc.data() as FormConfig);
  } catch (error) {
    console.error("Error fetching form configs:", error);
    return [];
  }
}

export async function getFormConfig(categoryId: string): Promise<FormConfig | null> {
  const db = getDb();
  try {
    const docRef = doc(db, "form_configurations", categoryId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as FormConfig) : null;
  } catch (error) {
    console.error("Error fetching form config:", error);
    return null;
  }
}

export type ParsedSubmission = {
  id: string;
  userId: string;
  formConfigurationId: string;
  submittedAt: string; // ISO string
  responses: Record<string, any>;
  attachments: Record<string, string>;
};

// --- Admin SDK for server-side privileged queries ---
import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getAdminApps().length) {
    initializeAdminApp({
      projectId: "studio-9085921874-cd434",
    });
  }
  return getAdminFirestore();
}

export async function getSubmissionsForCategory(categoryId: string): Promise<ParsedSubmission[]> {
  const adminDb = getAdminDb();
  try {
    const snapshot = await adminDb
      .collectionGroup("submissions")
      .where("formConfigurationId", "==", categoryId)
      .get();
    return snapshot.docs.map((d) => {
      const data = d.data();
      let responses = {};
      let attachments = {};
      try { responses = JSON.parse(data.responses || "{}"); } catch { }
      try { attachments = JSON.parse(data.attachments || "{}"); } catch { }
      return {
        id: d.id,
        userId: data.userId,
        formConfigurationId: data.formConfigurationId,
        submittedAt: data.submittedAt?.toDate?.()?.toISOString?.() || "",
        responses,
        attachments,
      };
    });
  } catch (error) {
    console.error("Error fetching submissions for category:", error);
    return [];
  }
}

export async function getSubmissionCounts(): Promise<Record<string, number>> {
  const adminDb = getAdminDb();
  try {
    const snapshot = await adminDb.collectionGroup("submissions").get();
    const counts: Record<string, number> = {};
    snapshot.docs.forEach((d) => {
      const catId = d.data().formConfigurationId;
      if (catId) {
        counts[catId] = (counts[catId] || 0) + 1;
      }
    });
    return counts;
  } catch (error) {
    console.error("Error fetching submission counts:", error);
    return {};
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
