import Chat from '@/components/Chat';
import AgentInfoSidebar from '@/components/AgentInfoSidebar';
import { AgentInfoSheet } from '@/components/AgentInfoSheet';
import { getAgentForViewer } from '@/actions/agents';
import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getKnowledgeByAgent } from '@/actions/knowledge';
import { buildKnowledgeSystemText } from '@/lib/knowledge';

export default async function AgentPage({ params, searchParams }: { params: Promise<{ 'agent-id': string }>; searchParams?: Promise<{ invite?: string; model?: string }> }) {
  const { 'agent-id': id } = await params;
  const tag = `@${id}`;

  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  const isAuthenticated = Boolean(session?.user);
  const isAdmin = session?.user?.role === 'admin';
  const cookieStore = await cookies();
  const cookieInvite = cookieStore.get(`agent_invite_${id}`)?.value;
  const resolvedSearchParams = await searchParams;
  const inviteParam = typeof resolvedSearchParams?.invite === 'string' ? resolvedSearchParams.invite : undefined;
  const modelParam = typeof resolvedSearchParams?.model === 'string' ? resolvedSearchParams.model : undefined;

  const { agent: found, inviteAccepted } = await getAgentForViewer({
    tag,
    userId: session?.user?.id,
    userRole: session?.user?.role,
    inviteCode: inviteParam || cookieInvite || null,
  });
  if (!found) notFound();

  if (inviteAccepted && inviteParam) {
    cookieStore.set({
      name: `agent_invite_${id}`,
      value: inviteParam,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  const canEdit = Boolean(isAdmin || (session?.user?.id && found.creatorId && session.user.id === found.creatorId));

  const avatarUrl = found.avatar ? `/avatars/${found.avatar}` : undefined;

  // Fetch knowledge once at page render and build combined system string
  const knowledge = await getKnowledgeByAgent(found.tag);
  const knowledgeText = buildKnowledgeSystemText(knowledge.map(k => ({ name: k.name, content: k.content })));
  const combinedSystem = [found.systemPrompt?.trim(), knowledgeText.trim()].filter(Boolean).join('\n\n');
  const modelOptions = Array.from(new Set([found.model, ...(Array.isArray(found.secondaryModels) ? found.secondaryModels : [])].filter(Boolean)));
  const initialModel = modelParam && modelOptions.includes(modelParam) ? modelParam : found.model;

  return (
    <main className="h-full ">
      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col h-full  p-4">
        {/* Sticky header at top */}
        <div className="flex-shrink-0 sticky top-0 px-6 z-10 bg-background border-b">
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
            publishStatus={found.publishStatus as 'draft' | 'pending_review' | 'approved' | 'rejected' | undefined}
            publishReviewNotes={found.publishReviewNotes || undefined}
          />
        </div>
        {/* Scrollable chat area */}
        <div className="flex-1 overflow-hidden ">
          <Chat
            className="mx-auto h-full"
            systemPrompt={combinedSystem}
            knowledgeText={combinedSystem}
            model={initialModel}
            modelOptions={modelOptions}
            avatarUrl={avatarUrl}
            isAuthenticated={isAuthenticated}
            agentTag={found.tag}
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-dvh  gap-4  max-h-[calc(100vh-100px)]">
        <div className="flex-1 max-w-[75%]">
          <Chat
            className="mx-auto"
            systemPrompt={combinedSystem}
            knowledgeText={combinedSystem}
            model={initialModel}
            modelOptions={modelOptions}
            avatarUrl={avatarUrl}
            isAuthenticated={isAuthenticated}
            agentTag={found.tag}
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
            publishStatus={found.publishStatus as 'draft' | 'pending_review' | 'approved' | 'rejected' | undefined}
            publishReviewNotes={found.publishReviewNotes || undefined}
          />
        </div>
      </div>
    </main>
  );
}
