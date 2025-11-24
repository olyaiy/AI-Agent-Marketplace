import Chat from '@/components/Chat';
import AgentInfoSidebar from '@/components/AgentInfoSidebar';
import { AgentInfoSheet } from '@/components/AgentInfoSheet';
import { getAgentForViewer } from '@/actions/agents';
import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
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

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ 'agent-id': string; 'conversation-id': string }>; searchParams?: { invite?: string; model?: string } }) {
  const { 'agent-id': agentId, 'conversation-id': conversationId } = await params;
  const tag = `@${agentId}`;

  const headerList = await headers();
  const cookieStore = await cookies();
  const inviteParam = typeof searchParams?.invite === 'string' ? searchParams.invite : undefined;
  const modelParam = typeof searchParams?.model === 'string' ? searchParams.model : undefined;
  const cookieInvite = cookieStore.get(`agent_invite_${agentId}`)?.value;

  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  if (!session?.user) notFound();

  const viewer = await getAgentForViewer({
    tag,
    userId: session.user.id,
    userRole: session.user.role,
    inviteCode: inviteParam || cookieInvite || null,
  });

  if (!viewer.agent) notFound();
  if (viewer.inviteAccepted && inviteParam) {
    cookieStore.set({
      name: `agent_invite_${agentId}`,
      value: inviteParam,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  const found = viewer.agent;

  const isAdmin = session.user.role === 'admin';
  const canEdit = Boolean(isAdmin || (session.user.id && found.creatorId && session.user.id === found.creatorId));

  // Parallel fetch: Conversation verification, Messages, and Knowledge
  const [convo, rows, knowledge] = await Promise.all([
    // Verify conversation ownership and agent binding
    db
      .select({ id: conversation.id, agentTag: conversation.agentTag, modelId: conversation.modelId })
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
  const modelOptions = Array.from(new Set([found.model, ...(Array.isArray(found.secondaryModels) ? found.secondaryModels : [])].filter(Boolean)));
  const persistedModel = convo[0].modelId && modelOptions.includes(convo[0].modelId) ? convo[0].modelId : undefined;
  const initialModel = (modelParam && modelOptions.includes(modelParam)) ? modelParam : found.model || persistedModel || modelOptions[0];

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
            visibility={found.visibility as 'public' | 'invite_only' | 'private'}
            inviteCode={canEdit ? found.inviteCode || undefined : undefined}
            canEdit={canEdit}
            modelOptions={modelOptions}
            activeModel={initialModel}
          />
        </div>
        {/* Scrollable chat area */}
        <div className="flex-1 overflow-hidden ">
          <Chat
            className="mx-auto h-full"
            systemPrompt={combinedSystem}
            model={initialModel}
            modelOptions={modelOptions}
            avatarUrl={avatarUrl}
            isAuthenticated={true}
            agentTag={found.tag}
            initialConversationId={conversationId}
            initialMessages={initialMessages as unknown[]}
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-dvh  gap-4  max-h-[calc(100vh-100px)]">
        <div className=" flex-1 max-w-[75%]">
          <Chat
            className="mx-auto"
            systemPrompt={combinedSystem}
            model={initialModel}
            modelOptions={modelOptions}
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
            modelOptions={modelOptions}
            activeModel={initialModel}
            visibility={found.visibility as 'public' | 'invite_only' | 'private'}
            inviteCode={canEdit ? found.inviteCode || undefined : undefined}
          />
        </div>
      </div>
    </div>
  );
}
