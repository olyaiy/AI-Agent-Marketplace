import { db } from '@/db/drizzle';
import { agent } from '@/db/schema';
import { redirect } from 'next/navigation';

async function createAgent(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string)?.trim();
  const name = (formData.get('name') as string)?.trim();
  const systemPrompt = (formData.get('systemPrompt') as string)?.trim();

  if (!id || !name || !systemPrompt) {
    return;
  }

  await db.insert(agent).values({ id, name, systemPrompt });
  redirect(`/agent/${encodeURIComponent(id)}`);
}

export default function CreateAgentPage() {
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl mb-4">Create Agent</h1>
      <form action={createAgent} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span>Agent ID</span>
          <input name="id" placeholder="e.g. luna" className="border p-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span>Agent Name</span>
          <input name="name" placeholder="e.g. Luna" className="border p-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span>System Prompt</span>
          <textarea name="systemPrompt" rows={8} placeholder="System instructions..." className="border p-2" />
        </label>
        <button type="submit" className="border p-2">Create</button>
      </form>
    </div>
  );
}
