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
  const found = await getAgentByTag(tag);
  if (!found) notFound();

  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  if (!session?.user) notFound();

  // Verify conversation ownership and agent binding
  const convo = await db
    .select({ id: conversation.id, agentTag: conversation.agentTag })
    .from(conversation)
    .where(sql`${conversation.id} = ${conversationId} AND ${conversation.userId} = ${session.user.id}`)
    .limit(1);
  if (convo.length === 0) notFound();
  if (convo[0].agentTag !== tag) notFound();

  // Fetch messages
  const rows = await db
    .select({ id: message.id, role: message.role, uiParts: message.uiParts, createdAt: message.createdAt })
    .from(message)
    .where(sql`${message.conversationId} = ${conversationId}`)
    .orderBy(sql`${message.createdAt} ASC`);

  const initialMessages: UIMessageShape[] = rows.map((r) => ({ id: r.id, role: r.role as UIMessageShape['role'], parts: r.uiParts as readonly unknown[] }));

  const avatarUrl = found.avatar ? `/avatars/${found.avatar}` : undefined;

  return (
    <div className="relative md:max-h-[calc(100vh-200px)]">
      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-full ">
        {/* Sticky header at top */}
        <div className="flex-shrink-0 sticky top-0 z-10 bg-background border-b">
          <AgentInfoSheet
            name={found.name}
            avatarUrl={avatarUrl}
            tagline={found.tagline}
            description={found.description}
          />
        </div>
        {/* Scrollable chat area */}
        <div className="flex-1 overflow-hidden ">
          <Chat
            className="mx-auto h-full"
            systemPrompt={found.systemPrompt}
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
            systemPrompt={found.systemPrompt}
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
          />
        </div>
      </div>
    </div>
  );
}


