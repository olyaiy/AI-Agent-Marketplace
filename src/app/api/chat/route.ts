import { streamText, UIMessage, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

   const result = streamText({
    model: 'google/gemini-2.0-flash-lite',
    messages: convertToModelMessages(messages),
  });


  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
