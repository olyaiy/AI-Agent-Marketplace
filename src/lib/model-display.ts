import * as LobehubIcons from '@lobehub/icons';

// Map provider slugs to Lobehub icon exports
export const PROVIDER_ICON_MAP: Record<string, any> = {
  openai: LobehubIcons.OpenAI,
  anthropic: LobehubIcons.Claude,
  google: LobehubIcons.Gemini,
  gemini: LobehubIcons.Gemini,
  meta: LobehubIcons.Meta,
  mistral: LobehubIcons.Mistral,
  cohere: LobehubIcons.Cohere,
  perplexity: LobehubIcons.Perplexity,
  deepseek: LobehubIcons.DeepSeek,
  xai: LobehubIcons.XAI,
  baidu: LobehubIcons.Baidu,
  bytedance: LobehubIcons.ByteDance,
  qwen: LobehubIcons.Qwen,
  huggingface: LobehubIcons.HuggingFace,
  groq: LobehubIcons.Groq,
  openrouter: LobehubIcons.OpenRouter,
  nvidia: LobehubIcons.Nvidia,
  sambanova: LobehubIcons.SambaNova,
  fireworks: LobehubIcons.Fireworks,
  together: LobehubIcons.Together,
  moonshotai: LobehubIcons.Moonshot,
  'z.ai': LobehubIcons.ZAI,
  zai: LobehubIcons.ZAI,
};

export function formatModelIdToTitle(raw: string) {
  const base = raw.trim();
  const right = base.includes('/') ? base.split('/').pop() || base : base;
  const normalized = right.replace(/[_-]+/g, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean).map((token) => {
    const lower = token.toLowerCase();
    if (lower === 'gpt') return 'GPT';
    if (lower === 'llama') return 'LLaMA';
    if (lower === 'o') return 'O';
    if (/^[a-z]+$/.test(token)) {
      return token.length <= 3 ? token.toUpperCase() : token.charAt(0).toUpperCase() + token.slice(1);
    }
    return token.charAt(0).toUpperCase() + token.slice(1);
  });
  return tokens.join(' ') || raw;
}

export function deriveProviderSlug(name: string | null | undefined, id: string) {
  if (name) {
    const m = name.match(/^([^:]+):/);
    if (m) return m[1].trim().toLowerCase();
  }
  const fromId = id.includes('/') ? id.split('/')[0] : '';
  return fromId.trim().toLowerCase() || null;
}

export function getDisplayName(fullName: string | undefined, id: string) {
  let candidate = fullName?.trim() || id;
  if (candidate.includes(':')) {
    candidate = candidate.split(':').slice(1).join(':').trim() || candidate;
  }
  if (candidate.includes('/')) {
    const right = candidate.split('/').pop() || candidate;
    candidate = right;
  }
  return /[A-Z]/.test(candidate) ? candidate : formatModelIdToTitle(candidate);
}
