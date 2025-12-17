import { headers } from 'next/headers';
import { getAgentsByCreator } from '@/actions/agents';
import { auth } from '@/lib/auth';
import { AgentGrid } from '@/components/AgentGrid';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function YourAgentsPage() {
  // Get current user session
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  const userId = session?.user?.id;

  // Redirect to home if not logged in
  if (!userId) {
    redirect('/');
  }

  // Fetch user's agents
  const agentsRaw = await getAgentsByCreator(userId);
  const agents = agentsRaw.map((agent) => {
    const visibility: 'public' | 'invite_only' | 'private' =
      agent.visibility === 'invite_only' || agent.visibility === 'private' ? agent.visibility : 'public';
    return { ...agent, visibility };
  });

  return (
    <main className="min-h-screen px-4 sm:px-2 md:px-4">
      <div className="mx-auto max-w-5xl py-8">
        {/* Header section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-foreground">Your Agents</h1>
            <p className="text-muted-foreground">
              Manage and view all the agents you&apos;ve created
            </p>
          </div>
          <Link href="/create">
            <Button>Create New Agent</Button>
          </Link>
        </div>

        {/* Agent Grid */}
        {agents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">You haven&apos;t created any agents yet.</p>
            <p className="text-sm text-muted-foreground/70 mb-6">
              Get started by creating your first AI agent.
            </p>
            <Link href="/create">
              <Button>Create Your First Agent</Button>
            </Link>
          </div>
        ) : (
          <AgentGrid agents={agents} currentUserId={userId} />
        )}
      </div>
    </main>
  );
}
