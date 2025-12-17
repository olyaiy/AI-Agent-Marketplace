import Chat from '@/components/Chat';
import { AgentInfoSheet } from '@/components/AgentInfoSheet';
import { AgentIntroHero } from '@/components/AgentIntroHero';
import { getAgentForViewer } from '@/actions/agents';
import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getKnowledgeByAgent } from '@/actions/knowledge';
import { buildKnowledgeSystemText } from '@/lib/knowledge';
import type { Metadata } from 'next';

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ 'agent-id': string }> }): Promise<Metadata> {
  const { 'agent-id': id } = await params;
  const tag = `@${id}`;

  const { agent } = await getAgentForViewer({
    tag,
    userId: undefined,
    userRole: undefined,
    inviteCode: null,
  });

  if (!agent) {
    return { title: 'Agent Not Found' };
  }

  const title = agent.name;
  const description = agent.tagline || agent.description || `Chat with ${agent.name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(agent.avatar && { images: [{ url: `/avatars/${agent.avatar}` }] }),
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

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

  // Agent hero props for both mobile and desktop
  const heroProps = {
    name: found.name,
    avatarUrl,
    tagline: found.tagline,
    description: found.description,
    agentTag: found.tag,
    canEdit,
    visibility: found.visibility as 'public' | 'invite_only' | 'private',
    publishStatus: found.publishStatus as 'draft' | 'pending_review' | 'approved' | 'rejected' | undefined,
    publishReviewNotes: found.publishReviewNotes || undefined,
  };

  return (
    <main className="h-full">
      {/* Mobile Layout - uses fixed positioning to avoid layout scroll conflicts */}
      <div className="md:hidden fixed inset-0 flex flex-col bg-background">
        {/* Header at top */}
        <div className="flex-shrink-0 bg-background border-b px-2 py-2">
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
        {/* Chat area with hero integrated */}
        <div className="flex-1 min-h-0 overflow-hidden px-2">
          <Chat
            className="mx-auto h-full"
            systemPrompt={combinedSystem}
            knowledgeText={combinedSystem}
            model={initialModel}
            modelOptions={modelOptions}
            avatarUrl={avatarUrl}
            isAuthenticated={isAuthenticated}
            agentTag={found.tag}
            showModelSelectorInPrompt
            agentHeroProps={heroProps}
          />
        </div>
      </div>

      {/* Desktop Layout - Full width centered, no sidebar */}
      <div className="hidden md:flex h-dvh max-h-[calc(100vh-100px)] justify-center">
        <div className="w-full max-w-3xl">
          <Chat
            className="mx-auto"
            systemPrompt={combinedSystem}
            knowledgeText={combinedSystem}
            model={initialModel}
            modelOptions={modelOptions}
            avatarUrl={avatarUrl}
            isAuthenticated={isAuthenticated}
            agentTag={found.tag}
            showModelSelectorInPrompt
            agentHeroProps={heroProps}
          />
        </div>
      </div>
    </main>
  );
}
