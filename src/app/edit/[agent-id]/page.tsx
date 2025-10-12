import { getAgentByTag, updateAgent, deleteAgent } from '@/actions/agents';
import { notFound, redirect } from 'next/navigation';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import EditAgentTwoColumnClient from './EditAgentTwoColumnClient';

async function saveAction(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string)?.trim();
  const name = (formData.get('name') as string)?.trim();
  const systemPrompt = (formData.get('systemPrompt') as string)?.trim();
  const model = (formData.get('model') as string | undefined)?.trim();
  const avatar = (formData.get('avatar') as string | undefined)?.trim();
  const tagline = (formData.get('tagline') as string | undefined)?.trim();
  const description = (formData.get('description') as string | undefined)?.trim();
  const tag = `@${id}`;
  await updateAgent({ tag, name, systemPrompt, model, avatar, tagline: tagline ?? null, description: description ?? null });
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
    <EditAgentTwoColumnClient
      id={id}
      tag={a.tag}
      initialName={a.name}
      initialSystemPrompt={a.systemPrompt || undefined}
      initialModel={a.model || undefined}
      initialAvatar={a.avatar || undefined}
      initialTagline={a.tagline || undefined}
      initialDescription={a.description || undefined}
      avatars={avatars}
      onSave={saveAction}
      onDelete={deleteAction}
    />
  );
}
