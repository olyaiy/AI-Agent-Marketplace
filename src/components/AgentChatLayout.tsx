'use client';

import * as React from 'react';
import Chat from '@/components/Chat';
import { AgentHeaderBar } from '@/components/AgentHeaderBar';
import {
    AGENT_NEW_CHAT_EVENT,
    AGENT_MESSAGES_CHANGE_EVENT,
    AgentMessagesChangeEvent
} from '@/lib/agent-events';

interface AgentHeroProps {
    name: string;
    avatarUrl?: string;
    tagline?: string | null;
    description?: string | null;
    agentTag?: string;
    canEdit?: boolean;
    visibility: 'public' | 'invite_only' | 'private';
    publishStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
    publishReviewNotes?: string;
}

interface AgentHeaderBarProps {
    name: string;
    avatarUrl?: string;
    tagline?: string | null;
    description?: string | null;
    agentTag?: string;
    canEdit?: boolean;
    modelOptions?: string[];
    activeModel?: string;
    visibility?: 'public' | 'invite_only' | 'private';
    inviteCode?: string;
    publishStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
    publishReviewNotes?: string;
}

interface ChatProps {
    className?: string;
    systemPrompt: string;
    model: string;
    modelOptions: string[];
    avatarUrl?: string;
    isAuthenticated: boolean;
    agentTag: string;
    initialConversationId?: string;
    initialMessages?: unknown[];
    agentHeroProps?: AgentHeroProps;
    knowledgeText?: string;
}

interface AgentChatLayoutProps {
    headerBarProps: AgentHeaderBarProps;
    chatProps: ChatProps;
    initialHasMessages: boolean;
}

/**
 * Unified layout component for agent chat pages (both new and existing conversations).
 * 
 * Manages header visibility based on message state:
 * - Shows AgentHeaderBar when there are messages
 * - Hides header (shows hero via Chat) when no messages
 * 
 * Listens for:
 * - agent:new-chat → hides header
 * - agent:messages-change → shows/hides header based on hasMessages
 */
export function AgentChatLayout({
    headerBarProps,
    chatProps,
    initialHasMessages,
}: AgentChatLayoutProps) {
    const [hasMessages, setHasMessages] = React.useState(initialHasMessages);
    const agentTag = chatProps.agentTag;

    // Listen for events that affect header visibility
    React.useEffect(() => {
        // Handler for "new chat" event - always hide header
        const handleNewChat = () => {
            setHasMessages(false);
        };

        // Handler for "messages change" event - show/hide based on hasMessages
        const handleMessagesChange = (event: Event) => {
            const detail = (event as AgentMessagesChangeEvent).detail;
            // Only respond to events for this agent (or global events)
            if (detail.agentTag && agentTag && detail.agentTag !== agentTag) return;
            setHasMessages(detail.hasMessages);
        };

        window.addEventListener(AGENT_NEW_CHAT_EVENT, handleNewChat);
        window.addEventListener(AGENT_MESSAGES_CHANGE_EVENT, handleMessagesChange as EventListener);

        return () => {
            window.removeEventListener(AGENT_NEW_CHAT_EVENT, handleNewChat);
            window.removeEventListener(AGENT_MESSAGES_CHANGE_EVENT, handleMessagesChange as EventListener);
        };
    }, [agentTag]);

    return (
        <div className="hidden md:block">
            {/* 
        Agent Header Bar - Only shown when there are messages.
        Uses negative margins to break out of layout padding.
        The header has pl-12 to accommodate the absolute sidebar trigger.
      */}
            {hasMessages && (
                <div className="-mt-4 -mx-6 rounded-t-xl overflow-hidden">
                    <AgentHeaderBar {...headerBarProps} />
                </div>
            )}

            {/* Chat area - height adjusts based on header presence */}
            <div className={hasMessages ? "h-[calc(100vh-100px)]" : "h-[calc(100vh-60px)]"}>
                <Chat
                    {...chatProps}
                    className="mx-auto h-full max-w-3xl"
                />
            </div>
        </div>
    );
}

// Keep the old name as an alias for backwards compatibility during migration
export { AgentChatLayout as ConversationDesktopLayout };
