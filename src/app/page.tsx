import Link from 'next/link';
import Image from 'next/image';
import { listAgents } from '@/actions/agents';

export default function Home() {
  return (
    <main className="h-full px-4">
      <div className="h-full mx-auto max-w-2xl py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl">Agents</h1>
          <Link href="/create" className="border px-3 py-1.5 text-sm rounded-md hover:bg-gray-50 transition-colors">Create Agent</Link>
        </div>
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
            <div className="flex items-center gap-3">
              {a.avatar ? (
                <Image
                  src={`/avatar/${a.avatar}`}
                  alt={`${a.name} avatar`}
                  width={40}
                  height={40}
                  className="rounded-md"
                  quality={90}
                />
              ) : null}
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-gray-500">{a.tag}</div>
              </div>
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
