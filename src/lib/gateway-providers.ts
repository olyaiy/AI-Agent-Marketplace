/**
 * Whitelist of providers currently available via the Vercel AI Gateway.
 * If models.dev lists additional providers we don't yet support, they are filtered out.
 */
export const GATEWAY_PROVIDER_SLUGS = [
  'alibaba',
  'anthropic',
  'arcee-ai',
  'azure',
  'baseten',
  'bedrock',
  'bfl',
  'cerebras',
  'cohere',
  'deepinfra',
  'deepseek',
  'fireworks',
  'google',
  'groq',
  'inception',
  'meituan',
  'minimax',
  'mistral',
  'moonshotai',
  'morph',
  'novita',
  'openai',
  'parasail',
  'perplexity',
  'streamlake',
  'vercel',
  'vertex',
  'voyage',
  'xai',
  'zai',
] as const;

export const GATEWAY_PROVIDER_SET = new Set<string>(
  GATEWAY_PROVIDER_SLUGS.map((p) => p.toLowerCase())
);
