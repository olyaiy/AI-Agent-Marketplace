import Chat from '@/components/Chat';
import AgentInfoSidebar from '@/components/AgentInfoSidebar';
import { AgentInfoSheet } from '@/components/AgentInfoSheet';
import { getAgentByTag } from '@/actions/agents';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation, message } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { getKnowledgeByAgent } from '@/actions/knowledge';
import { buildKnowledgeSystemText } from '@/lib/knowledge';

interface UIMessagePartText {
  type: 'text';
  text: string;
}

interface UIMessageShape {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: readonly UIMessagePartText[] | readonly unknown[];
}

export default async function ConversationPage({ params }: { params: Promise<{ 'agent-id': string; 'conversation-id': string }> }) {
  const { 'agent-id': agentId, 'conversation-id': conversationId } = await params;
  const tag = `@${agentId}`;

  const headerList = await headers();

  // Parallel fetch: Agent data and Session
  const [found, session] = await Promise.all([
    getAgentByTag(tag),
    auth.api.getSession({ headers: headerList }).catch(() => null)
  ]);

  if (!found) notFound();
  if (!session?.user) notFound();

  const isAdmin = session.user.role === 'admin';
  const canEdit = Boolean(isAdmin || (session.user.id && found.creatorId && session.user.id === found.creatorId));

  // Parallel fetch: Conversation verification, Messages, and Knowledge
  const [convo, rows, knowledge] = await Promise.all([
    // Verify conversation ownership and agent binding
    db
      .select({ id: conversation.id, agentTag: conversation.agentTag })
      .from(conversation)
      .where(sql`${conversation.id} = ${conversationId} AND ${conversation.userId} = ${session.user.id}`)
      .limit(1),

    // Fetch messages
    db
      .select({ id: message.id, role: message.role, uiParts: message.uiParts, createdAt: message.createdAt })
      .from(message)
      .where(sql`${message.conversationId} = ${conversationId} AND ${message.role} != 'system'`)
      .orderBy(sql`${message.createdAt} ASC`),

    // Fetch knowledge
    getKnowledgeByAgent(found.tag)
  ]);

  if (convo.length === 0) notFound();
  if (convo[0].agentTag !== tag) notFound();

  const initialMessages: UIMessageShape[] = rows.map((r) => ({ id: r.id, role: r.role as UIMessageShape['role'], parts: r.uiParts as readonly unknown[] }));

  const avatarUrl = found.avatar ? `/avatars/${found.avatar}` : undefined;

  // Build combined system from agent prompt + knowledge
  const knowledgeText = buildKnowledgeSystemText(knowledge.map(k => ({ name: k.name, content: k.content })));
  const combinedSystem = [found.systemPrompt?.trim(), knowledgeText.trim()].filter(Boolean).join('\n\n');

  return (
    <div className="relative md:max-h-[calc(100vh-200px)]">
      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-full  px-4 pb-4">
        {/* Sticky header at top */}
        <div className="flex-shrink-0 sticky top-0 z-10 px-6 bg-background border-b">
          <AgentInfoSheet
            name={found.name}
            avatarUrl={avatarUrl}
            tagline={found.tagline}
            description={found.description}
            agentTag={found.tag}
          />
        </div>
        {/* Scrollable chat area */}
        <div className="flex-1 overflow-hidden ">
          <Chat
            className="mx-auto h-full"
            systemPrompt={combinedSystem}
            model={found.model}
            avatarUrl={avatarUrl}
            isAuthenticated={true}
            agentTag={found.tag}
            initialConversationId={conversationId}
            initialMessages={initialMessages as unknown[]}
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-full  gap-4  max-h-[calc(100vh-100px)]">
        <div className=" flex-1 max-w-[75%]">
          <Chat
            className="mx-auto"
            systemPrompt={combinedSystem}
            model={found.model}
            avatarUrl={avatarUrl}
            isAuthenticated={true}
            agentTag={found.tag}
            initialConversationId={conversationId}
            initialMessages={initialMessages as unknown[]}
          />
        </div>
        <div className="w-[25%] min-w-[280px] flex-shrink-0">
          <AgentInfoSidebar
            name={found.name}
            avatarUrl={avatarUrl}
            tagline={found.tagline}
            description={found.description}
            agentTag={found.tag}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  );
}


