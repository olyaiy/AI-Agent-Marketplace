import { getAgentByTag, updateAgent, deleteAgent } from '@/actions/agents';
import { notFound, redirect } from 'next/navigation';
import { fetchGatewayLanguageModels } from '@/lib/gateway-models';
import { EditAgentClient } from './EditAgentClient';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { EditAvatarClient } from './EditAvatarClient';

async function saveAction(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string)?.trim();
  const name = (formData.get('name') as string)?.trim();
  const systemPrompt = (formData.get('systemPrompt') as string)?.trim();
  const model = (formData.get('model') as string | undefined)?.trim();
  const avatar = (formData.get('avatar') as string | undefined)?.trim();
  const tag = `@${id}`;
  await updateAgent({ tag, name, systemPrompt, model, avatar });
  redirect(`/agent/${encodeURIComponent(id)}`);
}

async function deleteAction(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string)?.trim();
  const tag = `@${id}`;
  await deleteAgent(tag);
  redirect(`/`);
}

export default async function EditAgentPage({ params }: { params: Promise<{ 'agent-id': string }> }) {
  const { 'agent-id': id } = await params;
  const tag = `@${id}`;
  const a = await getAgentByTag(tag);
  if (!a) notFound();
  const models = await fetchGatewayLanguageModels();
  const avatars = await (async () => {
    const folder = path.join(process.cwd(), 'public', 'avatar');
    try {
      const entries = await readdir(folder, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name))
        .map((name) => `/avatar/${name}`);
    } catch {
      return [] as string[];
    }
  })();

  return (
    <div className="max-w-xl mx-auto p-6  h-full">
      <h1 className="text-2xl mb-4">Edit Agent</h1>
      <form action={saveAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={id} />
        <div>
          <label className="block mb-2">Avatar</label>
          <EditAvatarClient avatars={avatars} initialAvatar={a.avatar ?? undefined} />
        </div>
        <div>
          <label className="block mb-2">Model</label>
          <EditAgentClient models={models} initialModel={a.model} />
        </div>
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
