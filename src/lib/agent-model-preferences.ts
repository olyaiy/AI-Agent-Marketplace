'use client';

const STORAGE_KEY = 'agent_model_prefs';

type AgentModelPrefs = Record<string, string>;

const normalizePrefs = (value: unknown): AgentModelPrefs => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const next: AgentModelPrefs = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim().length > 0) {
      next[key] = val;
    }
  }
  return next;
};

const readPrefs = (): AgentModelPrefs => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return {};
  }
};

const writePrefs = (prefs: AgentModelPrefs) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
};

export function getAgentModelPreference(agentTag?: string | null): string | undefined {
  if (!agentTag) return undefined;
  const prefs = readPrefs();
  return prefs[agentTag];
}

export function setAgentModelPreference(agentTag?: string | null, modelId?: string | null) {
  if (!agentTag || !modelId) return;
  const prefs = readPrefs();
  if (prefs[agentTag] === modelId) return;
  prefs[agentTag] = modelId;
  writePrefs(prefs);
}
