'use client';

export const AGENT_NEW_CHAT_EVENT = 'agent:new-chat';
export const AGENT_MODEL_CHANGE_EVENT = 'agent:model-change';
export const AGENT_MESSAGES_CHANGE_EVENT = 'agent:messages-change';

export interface AgentNewChatEventDetail {
  agentTag?: string | null;
}

export interface AgentMessagesChangeEventDetail {
  agentTag?: string | null;
  hasMessages: boolean;
}

export type AgentNewChatEvent = CustomEvent<AgentNewChatEventDetail>;
export type AgentModelChangeEvent = CustomEvent<{ agentTag?: string | null; modelId: string }>;
export type AgentMessagesChangeEvent = CustomEvent<AgentMessagesChangeEventDetail>;

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

export function dispatchAgentMessagesChange(agentTag: string | undefined | null, hasMessages: boolean) {
  if (typeof window === 'undefined') return;
  const event: AgentMessagesChangeEvent = new CustomEvent(AGENT_MESSAGES_CHANGE_EVENT, {
    detail: { agentTag, hasMessages },
  });
  window.dispatchEvent(event);
}
