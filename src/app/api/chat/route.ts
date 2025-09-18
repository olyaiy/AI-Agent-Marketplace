import { streamText, UIMessage, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const qpSystem = url.searchParams.get('systemPrompt') || undefined;
  const { messages, systemPrompt: bodySystem }: { messages: UIMessage[]; systemPrompt?: string } = await req.json().catch(() => ({ messages: [], systemPrompt: undefined }));
  const systemPrompt = bodySystem ?? qpSystem;

  const result = streamText({
    model: 'openai/gpt-5-nano',
    providerOptions: {
      openai: {
        reasoningEffort: 'minimal',
      },
    },
  
    system: systemPrompt,
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
