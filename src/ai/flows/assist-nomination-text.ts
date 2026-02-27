'use server';
/**
 * @fileOverview An AI assistant for nominators to refine free-text answers in nomination forms.
 *
 * - assistNominationText - A function that leverages AI to suggest phrasing, expand bullet points, or summarize text.
 * - AssistNominationTextInput - The input type for the assistNominationText function.
 * - AssistNominationTextOutput - The return type for the assistNominationText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AssistNominationTextInputSchema = z.object({
  text: z.string().describe('The text from the nomination form field to be processed.'),
  action: z.enum(['suggest_phrasing', 'expand_bullet_points', 'summarize']).describe('The desired AI action to perform on the text.'),
  context: z.string().optional().describe('Optional additional context, such as the nomination question or guidelines, to help the AI.'),
});
export type AssistNominationTextInput = z.infer<typeof AssistNominationTextInputSchema>;

const AssistNominationTextOutputSchema = z.object({
  suggestedText: z.string().describe('The AI-generated suggested or processed text.'),
});
export type AssistNominationTextOutput = z.infer<typeof AssistNominationTextOutputSchema>;

export async function assistNominationText(input: AssistNominationTextInput): Promise<AssistNominationTextOutput> {
  return assistNominationTextFlow(input);
}

const assistNominationTextPrompt = ai.definePrompt({
  name: 'assistNominationTextPrompt',
  input: { schema: AssistNominationTextInputSchema },
  output: { schema: AssistNominationTextOutputSchema },
  prompt: `You are an AI assistant designed to help nominators write impactful and concise responses for award applications.

Context provided: {{{context}}}

{{#eq action "suggest_phrasing"}}
  Improve the phrasing of the following text to make it more impactful, professional, and concise for a nomination application. Only provide the improved text.
  Text to improve:
  """
  {{{text}}}
  """
{{/eq}}

{{#eq action "expand_bullet_points"}}
  Expand the following bullet points into a detailed, well-structured paragraph suitable for a formal nomination application. Only provide the expanded paragraph.
  Bullet points to expand:
  """
  {{{text}}}
  """
{{/eq}}

{{#eq action "summarize"}}
  Summarize the following text, making it more concise and impactful for a nomination application. Only provide the summarized text.
  Text to summarize:
  """
  {{{text}}}
  """

Your response should only contain the processed text, without any conversational filler or extra information.
`,
});

const assistNominationTextFlow = ai.defineFlow(
  {
    name: 'assistNominationTextFlow',
    inputSchema: AssistNominationTextInputSchema,
    outputSchema: AssistNominationTextOutputSchema,
  },
  async (input) => {
    const { output } = await assistNominationTextPrompt(input);
    if (!output) {
      throw new Error('AI did not return a suggested text.');
    }
    return output;
  }
);
