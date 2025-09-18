import Link from 'next/link';
import { listAgents } from '@/actions/agents';
import { fetchAllModels } from '@/lib/models-dev';
import { ModelSelect } from '@/components/ModelSelect';

export default async function Home() {
  const models = await fetchAllModels();
  return (
    <main className="h-full px-4">
      <div className="h-full mx-auto max-w-2xl py-8">
        <div className="mb-6">
          <ModelSelect models={models} />
        </div>
        <h1 className="text-xl mb-4">Agents</h1>
        {/* Server Component: fetch and render agents */}
        <AgentsList />
      </div>
    </main>
  );
}

async function AgentsList() {
  const agents = await listAgents();
  if (!agents.length) {
    return <p className="text-sm text-gray-500">No agents yet. Create one at /create.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {agents.map((a) => (
        <li key={a.tag} className="border p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{a.name}</div>
              <div className="text-xs text-gray-500">{a.tag}</div>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/agent/${encodeURIComponent(a.tag.replace(/^@/, ''))}`} className="underline text-sm">
                Open
              </Link>
              <Link href={`/edit/${encodeURIComponent(a.tag.replace(/^@/, ''))}`} className="underline text-sm">
                Edit
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
