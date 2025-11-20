'use client';

export const AGENT_NEW_CHAT_EVENT = 'agent:new-chat';
export const AGENT_MODEL_CHANGE_EVENT = 'agent:model-change';

export interface AgentNewChatEventDetail {
  agentTag?: string | null;
}

export type AgentNewChatEvent = CustomEvent<AgentNewChatEventDetail>;
export type AgentModelChangeEvent = CustomEvent<{ agentTag?: string | null; modelId: string }>;

export function dispatchAgentNewChat(agentTag?: string | null) {
  if (typeof window === 'undefined') return;
  const event: AgentNewChatEvent = new CustomEvent(AGENT_NEW_CHAT_EVENT, {
    detail: { agentTag },
  });
  window.dispatchEvent(event);
}

export function dispatchAgentModelChange(agentTag: string | undefined | null, modelId: string) {
  if (typeof window === 'undefined') return;
  const event: AgentModelChangeEvent = new CustomEvent(AGENT_MODEL_CHANGE_EVENT, {
    detail: { agentTag, modelId },
  });
  window.dispatchEvent(event);
}
