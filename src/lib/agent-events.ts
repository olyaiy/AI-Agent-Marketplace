'use client';

export const AGENT_NEW_CHAT_EVENT = 'agent:new-chat';

export interface AgentNewChatEventDetail {
  agentTag?: string | null;
}

export type AgentNewChatEvent = CustomEvent<AgentNewChatEventDetail>;

export function dispatchAgentNewChat(agentTag?: string | null) {
  if (typeof window === 'undefined') return;
  const event: AgentNewChatEvent = new CustomEvent(AGENT_NEW_CHAT_EVENT, {
    detail: { agentTag },
  });
  window.dispatchEvent(event);
}
