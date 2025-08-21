import { streamText, UIMessage, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

   const result = streamText({
    model: 'openai/gpt-oss-20b',
    messages: convertToModelMessages(messages),
  });


  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
