import Chat from '@/components/Chat';
import AgentInfoSidebar from '@/components/AgentInfoSidebar';
import { getAgentByTag } from '@/actions/agents';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export default async function AgentPage({ params }: { params: Promise<{ 'agent-id': string }> }) {
  const { 'agent-id': id } = await params;
  const tag = `@${id}`;
  const found = await getAgentByTag(tag);
  if (!found) notFound();

  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  const isAuthenticated = Boolean(session?.user);

  return (
    <main className="h-full px-4 ">
      <div className="size-full mx-auto flex gap-4 ">
        <div className="w-1/4 flex-shrink-0 ">
          <AgentInfoSidebar name={found.name} avatarUrl={found.avatar ? `/avatar/${found.avatar}` : undefined} tagline={found.tagline} description={found.description} />
        </div>
        <div className="flex-1 max-w-3/4 items-center justify-center r-auto  ">
          <Chat className=' mx-auto' systemPrompt={found.systemPrompt} model={found.model} avatarUrl={found.avatar ? `/avatar/${found.avatar}` : undefined} isAuthenticated={isAuthenticated} agentTag={found.tag} />
        </div>
      </div>
    </main>
  );
}