
'use server';
/**
 * @fileOverview Generates personalized motivational messages for task completion or approaching due dates.
 *
 * - generateMotivationalMessage - A function that generates a personalized motivational message.
 * - MotivationalMessageInput - The input type for the generateMotivationalMessage function.
 * - MotivationalMessageOutput - The return type for the generateMotivationalMessage function.
 */

import {ai} from '../genkit.ts'; // Explicit .ts extension
import {z} from 'genkit';

const MotivationalMessageInputSchema = z.object({
  taskName: z.string().describe('The name of the task.'),
  userName: z.string().describe('The name of the user.'),
  taskCompletionStatus: z
    .boolean()
    .describe('Whether the task is completed or not.'),
  daysUntilDueDate: z
    .number()
    .describe('The number of days until the task due date.'),
});
export type MotivationalMessageInput = z.infer<typeof MotivationalMessageInputSchema>;

const MotivationalMessageOutputSchema = z.object({
  message: z.string().describe('The personalized motivational message.'),
});
export type MotivationalMessageOutput = z.infer<typeof MotivationalMessageOutputSchema>;

export async function generateMotivationalMessage(
  input: MotivationalMessageInput
): Promise<MotivationalMessageOutput> {
  return generateMotivationalMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'motivationalMessagePrompt',
  input: {schema: MotivationalMessageInputSchema},
  output: {schema: MotivationalMessageOutputSchema},
  prompt: `You are a motivational assistant that provides personalized messages to users based on their task completion status and due dates.

  Here are some message templates:
  - Task Completion: "Great job, {{userName}}! You've completed {{taskName}}. Keep up the momentum!"
  - Approaching Due Date: "Hey {{userName}}, {{taskName}} is due in {{daysUntilDueDate}} days. You've got this!"
  - Task Completion with Urgency: "Excellent! Finishing {{taskName}} brings you closer to your goals. What's next, {{userName}}?"
  - Encouragement: "Just a reminder, {{userName}}, {{taskName}} is on your list. A little progress each day adds up to big results!"

  Based on the following information, select the best message template and personalize it:
  User Name: {{userName}}
  Task Name: {{taskName}}
  Task Completion Status: {{taskCompletionStatus}}
  Days Until Due Date: {{daysUntilDueDate}}

  Ensure the message is concise and encouraging.`,
});

const generateMotivationalMessageFlow = ai.defineFlow(
  {
    name: 'generateMotivationalMessageFlow',
    inputSchema: MotivationalMessageInputSchema,
    outputSchema: MotivationalMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

