import { generateText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

const gateway = createGateway({
  apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY,
});

export async function generateConversationTitle(userMessage: string): Promise<string> {
  try {
    const { text: title } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      system: `You will generate a short title based on the first message a user begins a conversation with.
- Ensure it is not more than 60 characters long
- The title should be a summary of the user's message
- Do not use quotes or colons
- Be concise and descriptive
- Do not use the word "user" in the title
`,
      prompt: userMessage,
    });




    return title.trim().slice(0, 60);
  } catch (error) {
    console.log("WE RAN INTO AN ERROR GENERATING THE MESSAGE");
    console.error('Failed to generate title:', error);
    // Fallback to truncated message
    return userMessage.slice(0, 60).trim();
  }
}
