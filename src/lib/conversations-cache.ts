import { mutate } from 'swr';
import type { ConversationItem } from '@/components/recent-conversations-client';

export const CONVERSATIONS_KEY = '/api/conversations';

/**
 * Revalidate the conversations list from the server
 */
export function revalidateConversations() {
  return mutate(CONVERSATIONS_KEY);
}

/**
 * Add a conversation optimistically to the cache
 */
export async function addConversationOptimistically(conversation: ConversationItem) {
  await mutate<ConversationItem[]>(
    CONVERSATIONS_KEY,
    (currentData) => {
      return [conversation, ...(currentData || [])];
    },
    { revalidate: false }
  );
}

/**
 * Remove a conversation optimistically from the cache
 */
export async function removeConversationOptimistically(conversationId: string) {
  await mutate<ConversationItem[]>(
    CONVERSATIONS_KEY,
    (currentData) => {
      return (currentData || []).filter((c) => c.id !== conversationId);
    },
    { revalidate: false }
  );
}

/**
 * Update a conversation title optimistically in the cache
 */
export async function updateConversationTitleOptimistically(
  conversationId: string,
  newTitle: string
) {
  await mutate<ConversationItem[]>(
    CONVERSATIONS_KEY,
    (currentData) => {
      return (currentData || []).map((c) =>
        c.id === conversationId ? { ...c, title: newTitle } : c
      );
    },
    { revalidate: false }
  );
}

/**
 * Trigger AI-powered title generation for a conversation (fire-and-forget)
 */
export function generateConversationTitleAsync(conversationId: string) {
  fetch(`/api/conversations/${conversationId}/generate-title`, {
    method: 'POST',
  })
    .then(() => {
      // Revalidate to show new title
      revalidateConversations();
    })
    .catch(() => {
      // Silently fail - title generation is not critical
      console.warn(`Failed to generate title for conversation ${conversationId}`);
    });
}
