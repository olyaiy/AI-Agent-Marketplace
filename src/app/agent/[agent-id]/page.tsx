import Chat from '@/components/Chat';
import AgentInfoSidebar from '@/components/AgentInfoSidebar';
import { getAgentByTag } from '@/actions/agents';
import { notFound } from 'next/navigation';

export default async function AgentPage({ params }: { params: Promise<{ 'agent-id': string }> }) {
  const { 'agent-id': id } = await params;
  const tag = `@${id}`;
  const found = await getAgentByTag(tag);
  if (!found) notFound();

  return (
    <main className="h-full px-4">
      <div className="h-full mx-auto flex gap-4">
        <div className="w-1/4 flex-shrink-0">
          <AgentInfoSidebar />
        </div>
        <div className="flex-1 max-w-3/4 items-center justify-center r-auto ">
          <Chat className=' mx-auto' systemPrompt={found.systemPrompt} />
        </div>
      </div>
    </main>
  );
}