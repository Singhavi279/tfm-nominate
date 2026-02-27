import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

export const QuestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['TEXT', 'PARAGRAPH', 'MULTIPLE_CHOICE', 'CHECKBOX', 'FILE_UPLOAD']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  questions: z.array(QuestionSchema),
});
export type Section = z.infer<typeof SectionSchema>;

export const FormConfigSchema = z.object({
  id: z.string(), // The document ID, e.g. transformational_leader
  segmentName: z.string(),
  categoryName: z.string(),
  description: z.string(),
  sections: z.array(SectionSchema),
});
export type FormConfig = z.infer<typeof FormConfigSchema>;

export type Draft = {
  // This type represents the structure of a draft document in Firestore.
  // The document ID is the formConfigurationId.
  userId: string;
  formConfigurationId: string;
  lastSavedAt: Timestamp;
  formData: string; // A JSON string of the form responses.
};

export type Submission = {
  id: string; // Auto-generated Firestore ID
  userId: string;
  formConfigurationId: string;
  submittedAt: Timestamp;
  responses: string; // A JSON string of the form responses.
  attachments: string; // A JSON string mapping question ID to file URL.
};
