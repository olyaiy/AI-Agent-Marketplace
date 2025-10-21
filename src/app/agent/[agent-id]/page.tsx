import Chat from '@/components/Chat';
import AgentInfoSidebar from '@/components/AgentInfoSidebar';
import { AgentInfoSheet } from '@/components/AgentInfoSheet';
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

  const avatarUrl = found.avatar ? `/avatars/${found.avatar}` : undefined;

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
          />
        </div>
        {/* Scrollable chat area */}
        <div className="flex-1 overflow-hidden ">
          <Chat
            className="mx-auto h-full"
            systemPrompt={found.systemPrompt}
            model={found.model}
            avatarUrl={avatarUrl}
            isAuthenticated={isAuthenticated}
            agentTag={found.tag}
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-full  gap-4  max-h-[calc(100vh-100px)]">
        <div className="flex-1 max-w-[75%]">
          <Chat
            className="mx-auto"
            systemPrompt={found.systemPrompt}
            model={found.model}
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
          />
        </div>
      </div>
    </main>
  );
}