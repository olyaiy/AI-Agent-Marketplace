import { getAgentByTag, updateAgent, deleteAgent } from '@/actions/agents';
import { notFound, redirect } from 'next/navigation';

async function saveAction(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string)?.trim();
  const name = (formData.get('name') as string)?.trim();
  const systemPrompt = (formData.get('systemPrompt') as string)?.trim();
  const tag = `@${id}`;
  await updateAgent({ tag, name, systemPrompt });
  redirect(`/agent/${encodeURIComponent(id)}`);
}

async function deleteAction(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string)?.trim();
  const tag = `@${id}`;
  await deleteAgent(tag);
  redirect(`/`);
}

export default async function EditAgentPage({ params }: { params: { 'agent-id': string } }) {
  const id = params['agent-id'];
  const tag = `@${id}`;
  const a = await getAgentByTag(tag);
  if (!a) notFound();

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl mb-4">Edit Agent</h1>
      <form action={saveAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={id} />
        <label className="flex flex-col gap-1">
          <span>Agent name</span>
          <input name="name" defaultValue={a.name} className="border p-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span>Tag</span>
          <input disabled value={a.tag} className="border p-2 bg-gray-50" />
        </label>
        <label className="flex flex-col gap-1">
          <span>System prompt</span>
          <textarea name="systemPrompt" defaultValue={a.systemPrompt} rows={8} className="border p-2" />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="border p-2">Save</button>
          <button formAction={deleteAction} className="border p-2">Delete</button>
        </div>
      </form>
    </div>
  );
}
