'use server';
/**
 * @fileOverview A Genkit flow for generating a JSON form configuration schema from a natural language description.
 *
 * - generateFormConfig - A function that handles the generation of the form configuration.
 * - GenerateFormConfigInput - The input type for the generateFormConfig function.
 * - GenerateFormConfigOutput - The return type for the generateFormConfig function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuestionTypeSchema = z.enum([
  'TEXT',
  'PARAGRAPH',
  'MULTIPLE_CHOICE',
  'CHECKBOX',
  'FILE_UPLOAD',
]);

const QuestionSchema = z.object({
  id: z
    .string()
    .describe('Unique kebab-case identifier for the question, derived from its title.'),
  title: z.string().describe('The display title of the question.'),
  type: QuestionTypeSchema.describe(
    'The type of input field. Can be TEXT, PARAGRAPH, MULTIPLE_CHOICE, CHECKBOX, or FILE_UPLOAD.'
  ),
  required: z.boolean().describe('Whether this question is mandatory.'),
  options: z
    .array(z.string())
    .optional()
    .describe('An array of options for MULTIPLE_CHOICE or CHECKBOX question types.'),
});

const SectionSchema = z.object({
  id: z
    .string()
    .describe('Unique kebab-case identifier for the section, derived from its title.'),
  title: z.string().describe('The display title of the section.'),
  questions: z.array(QuestionSchema).describe('An array of questions within this section.'),
});

export const GenerateFormConfigInputSchema = z.object({
  description: z
    .string()
    .describe(
      'A natural language description of the award category, its purpose, segments, and the required form fields and sections.'
    ),
});
export type GenerateFormConfigInput = z.infer<typeof GenerateFormConfigInputSchema>;

export const GenerateFormConfigOutputSchema = z.object({
  segmentName: z.string().describe('The name of the segment this award category belongs to (e.g., Individuals, Organizations).'),
  categoryName: z.string().describe('The name of the award category (e.g., Transformational Leader in Maternity Healthcare).'),
  description: z.string().describe('A brief description of the award category.'),
  sections: z
    .array(SectionSchema)
    .describe(
      'An array of sections, each containing a group of questions that form the nomination application.'
    ),
});
export type GenerateFormConfigOutput = z.infer<typeof GenerateFormConfigOutputSchema>;

export async function generateFormConfig(
  input: GenerateFormConfigInput
): Promise<GenerateFormConfigOutput> {
  return generateFormConfigFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFormConfigPrompt',
  input: { schema: GenerateFormConfigInputSchema },
  output: { schema: GenerateFormConfigOutputSchema },
  prompt: `You are an expert at creating structured JSON schemas for dynamic web forms.

Based on the following natural language description, generate a complete JSON configuration schema for a dynamic award nomination form.

Strictly adhere to the output JSON schema provided. Ensure all string values for 'id' fields (for sections and questions) are unique, lowercase, and kebab-cased versions of their respective 'title' fields.

Interpret the natural language as follows:
- "short answer" or "name" implies a 'TEXT' type.
- "long answer", "description", or "essay" implies a 'PARAGRAPH' type.
- "select one", "choose an option", or a list of exclusive choices implies a 'MULTIPLE_CHOICE' type.
- "select all that apply" or a list of non-exclusive choices implies a 'CHECKBOX' type.
- "upload file", "attach document", "PDF upload", or similar implies a 'FILE_UPLOAD' type.
- Clearly stated sections should become top-level 'sections' in the output.
- Each question must have an 'id', 'title', 'type', and 'required' flag. 'options' are only for 'MULTIPLE_CHOICE' and 'CHECKBOX'.

Description: {{{description}}}
`,
});

const generateFormConfigFlow = ai.defineFlow(
  {
    name: 'generateFormConfigFlow',
    inputSchema: GenerateFormConfigInputSchema,
    outputSchema: GenerateFormConfigOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
