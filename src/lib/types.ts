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
  id: string; // Composite key: userId_categoryId
  userId: string;
  categoryId: string;
  updatedAt: Timestamp;
  responses: { [key: string]: any };
};

export type Submission = {
  id: string; // Auto-generated Firestore ID
  userId: string;
  categoryId: string;
  submittedAt: Timestamp;
  responses: { [key: string]: any };
  attachments: { [key: string]: string }; // question.id -> fileUrl
};
