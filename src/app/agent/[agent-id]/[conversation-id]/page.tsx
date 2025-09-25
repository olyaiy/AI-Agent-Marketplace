import Chat from '@/components/Chat';
import AgentInfoSidebar from '@/components/AgentInfoSidebar';
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

  const initialMessages: UIMessageShape[] = rows.map((r) => ({ id: r.id, role: r.role as UIMessageShape['role'], parts: r.uiParts as any }));

  return (
    <main className="h-full px-4">
      <div className="h-full mx-auto flex gap-4">
        <div className="w-1/4 flex-shrink-0">
          <AgentInfoSidebar name={found.name} avatarUrl={found.avatar ? `/avatar/${found.avatar}` : undefined} tagline={found.tagline} description={found.description} />
        </div>
        <div className="flex-1 max-w-3/4 items-center justify-center r-auto ">
          <Chat
            className=' mx-auto'
            systemPrompt={found.systemPrompt}
            model={found.model}
            avatarUrl={found.avatar ? `/avatar/${found.avatar}` : undefined}
            isAuthenticated={true}
            agentTag={found.tag}
            initialConversationId={conversationId}
            initialMessages={initialMessages as any}
          />
        </div>
      </div>
    </main>
  );
}


