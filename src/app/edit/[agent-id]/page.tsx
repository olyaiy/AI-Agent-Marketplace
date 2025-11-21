import { getAgentByTag, updateAgent, deleteAgent } from '@/actions/agents';
import { notFound, redirect } from 'next/navigation';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import EditAgentTwoColumnClient from './EditAgentTwoColumnClient';
import { getKnowledgeByAgent } from '@/actions/knowledge';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function saveAction(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string)?.trim();
  const name = (formData.get('name') as string)?.trim();
  const systemPrompt = (formData.get('systemPrompt') as string)?.trim();
  const model = (formData.get('model') as string | undefined)?.trim();
  const secondaryModelsRaw = formData.get('secondaryModels') as string | undefined;
  const avatar = (formData.get('avatar') as string | undefined)?.trim();
  const tagline = (formData.get('tagline') as string | undefined)?.trim();
  const description = (formData.get('description') as string | undefined)?.trim();
  const visibilityRaw = formData.get('visibility');
  const visibility = typeof visibilityRaw === 'string' ? visibilityRaw : undefined;
  let secondaryModels: string[] | undefined = undefined;
  if (typeof secondaryModelsRaw === 'string' && secondaryModelsRaw.trim().length > 0) {
    try {
      const parsed = JSON.parse(secondaryModelsRaw);
      if (Array.isArray(parsed)) secondaryModels = parsed as string[];
    } catch {
      secondaryModels = undefined;
    }
  }
  const tag = `@${id}`;
  await updateAgent({ tag, name, systemPrompt, model, secondaryModels, avatar, tagline: tagline ?? null, description: description ?? null, visibility });
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
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  if (!session?.user) redirect('/');
  const a = await getAgentByTag(tag);
  if (!a) notFound();
  const isAdmin = session.user.role === 'admin';
  const isOwner = Boolean(a.creatorId && session.user.id === a.creatorId);
  if (!isAdmin && !isOwner) notFound();
  const knowledge = await getKnowledgeByAgent(tag);
  const knowledgeItems = knowledge.map(k => ({ name: k.name, content: k.content }));
  const avatars = await (async () => {
    const folder = path.join(process.cwd(), 'public', 'avatars');
    try {
      const entries = await readdir(folder, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name))
        .map((name) => `/avatars/${name}`);
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
      initialSecondaryModels={Array.isArray(a.secondaryModels) ? a.secondaryModels : []}
      initialAvatar={a.avatar || undefined}
      initialTagline={a.tagline || undefined}
      initialDescription={a.description || undefined}
      initialVisibility={a.visibility}
      inviteCode={a.inviteCode || undefined}
      avatars={avatars}
      onSave={saveAction}
      onDelete={deleteAction}
      knowledgeItems={knowledgeItems}
    />
  );
}
