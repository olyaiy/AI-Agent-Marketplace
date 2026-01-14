import { getAgentByTag, updateAgent, deleteAgent, requestAgentReview, withdrawAgentReview } from '@/actions/agents';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import EditAgentTwoColumnClient from './EditAgentTwoColumnClient';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const AVATAR_CACHE_TTL_MS = 5 * 60 * 1000;
let avatarCache: { fetchedAt: number; avatars: string[] } | null = null;
let avatarCachePromise: Promise<string[]> | null = null;

async function loadAvatars() {
  const now = Date.now();
  if (avatarCache && now - avatarCache.fetchedAt < AVATAR_CACHE_TTL_MS) {
    return avatarCache.avatars;
  }
  if (avatarCachePromise) return avatarCachePromise;

  avatarCachePromise = (async () => {
    const folder = path.join(process.cwd(), 'public', 'avatars');
    try {
      const entries = await readdir(folder, { withFileTypes: true });
      const avatars = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name))
        .map((name) => `/avatars/${name}`);
      avatarCache = { fetchedAt: now, avatars };
      return avatars;
    } catch {
      avatarCache = { fetchedAt: now, avatars: [] };
      return [];
    } finally {
      avatarCachePromise = null;
    }
  })();

  return avatarCachePromise;
}

async function saveAction(formData: FormData) {
  'use server';
  console.time('[SERVER] Total saveAction');
  console.time('[SERVER] Parse formData');
  const id = (formData.get('id') as string)?.trim();
  const name = (formData.get('name') as string)?.trim();
  const systemPrompt = (formData.get('systemPrompt') as string)?.trim();
  const model = (formData.get('model') as string | undefined)?.trim();
  const secondaryModelsRaw = formData.get('secondaryModels') as string | undefined;
  const avatar = (formData.get('avatar') as string | undefined)?.trim();
  const tagline = (formData.get('tagline') as string | undefined)?.trim();
  const description = (formData.get('description') as string | undefined)?.trim();
  const visibilityRaw = formData.get('visibility');
  const visibility = typeof visibilityRaw === 'string' && (visibilityRaw === 'public' || visibilityRaw === 'invite_only' || visibilityRaw === 'private')
    ? visibilityRaw
    : undefined;
  console.timeEnd('[SERVER] Parse formData');
  console.time('[SERVER] Get session (auth)');
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  console.timeEnd('[SERVER] Get session (auth)');
  const actorId = session?.user?.id ?? null;
  const actorRole = session?.user?.role ?? null;
  let secondaryModels: string[] | undefined = undefined;
  if (typeof secondaryModelsRaw === 'string' && secondaryModelsRaw.trim().length > 0) {
    try {
      const parsed = JSON.parse(secondaryModelsRaw);
      if (Array.isArray(parsed)) secondaryModels = parsed as string[];
    } catch {
      secondaryModels = undefined;
    }
  }
  const providerOptionsRaw = formData.get('providerOptions') as string | undefined;
  let providerOptions: Record<string, { order?: string[]; only?: string[] }> | undefined = undefined;
  if (typeof providerOptionsRaw === 'string' && providerOptionsRaw.trim().length > 0) {
    try {
      const parsed = JSON.parse(providerOptionsRaw);
      if (parsed && typeof parsed === 'object') providerOptions = parsed as Record<string, { order?: string[]; only?: string[] }>;
    } catch {
      providerOptions = undefined;
    }
  }
  const tag = `@${id}`;
  console.time('[SERVER] updateAgent()');
  await updateAgent({ tag, name, systemPrompt, model, secondaryModels, providerOptions, avatar, tagline: tagline ?? null, description: description ?? null, visibility, actorId, actorRole });
  console.timeEnd('[SERVER] updateAgent()');
  console.time('[SERVER] revalidatePath()');
  revalidatePath(`/edit/${encodeURIComponent(id)}`);
  console.timeEnd('[SERVER] revalidatePath()');
  console.timeEnd('[SERVER] Total saveAction');
}

async function deleteAction(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string)?.trim();
  const tag = `@${id}`;
  await deleteAgent(tag);
  redirect(`/`);
}

async function requestPublicAction(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string)?.trim();
  const tag = `@${id}`;
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  const actorId = session?.user?.id ?? null;
  const actorRole = session?.user?.role ?? null;
  const result = await requestAgentReview(tag, actorId, actorRole);
  if (!result.ok) {
    throw new Error(result.error || 'Unable to request public review');
  }
  redirect(`/edit/${encodeURIComponent(id)}`);
}

async function withdrawPublicAction(formData: FormData) {
  'use server';
  const id = (formData.get('id') as string)?.trim();
  const tag = `@${id}`;
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  const actorId = session?.user?.id ?? null;
  const actorRole = session?.user?.role ?? null;
  const result = await withdrawAgentReview(tag, actorId, actorRole);
  if (!result.ok) {
    throw new Error(result.error || 'Unable to withdraw public request');
  }
  redirect(`/edit/${encodeURIComponent(id)}`);
}

export default async function EditAgentPage({ params }: { params: Promise<{ 'agent-id': string }> }) {
  const { 'agent-id': id } = await params;
  const tag = `@${id}`;
  const headerList = await headers();
  const sessionPromise = auth.api.getSession({ headers: headerList }).catch(() => null);
  const agentPromise = getAgentByTag(tag);
  const avatarsPromise = loadAvatars();
  const [session, a, avatars] = await Promise.all([sessionPromise, agentPromise, avatarsPromise]);
  if (!session?.user) redirect('/');
  const isAuthenticated = Boolean(session.user);
  if (!a) notFound();
  const isAdmin = session.user.role === 'admin';
  const isOwner = Boolean(a.creatorId && session.user.id === a.creatorId);
  if (!isAdmin && !isOwner) notFound();
  const initialVisibility = a.visibility === 'public' || a.visibility === 'invite_only' || a.visibility === 'private'
    ? a.visibility
    : 'public';

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
      initialVisibility={initialVisibility}
      inviteCode={a.inviteCode || undefined}
      initialProviderOptions={(a.providerOptions as Record<string, { order?: string[]; only?: string[] }> | undefined) || {}}
      isAuthenticated={isAuthenticated}
      publishStatus={(a.publishStatus as 'draft' | 'pending_review' | 'approved' | 'rejected') || 'draft'}
      publishReviewNotes={a.publishReviewNotes || undefined}
      publishRequestedAt={a.publishRequestedAt ? a.publishRequestedAt.toISOString() : undefined}
      avatars={avatars}
      onSave={saveAction}
      onDelete={deleteAction}
      onRequestPublic={requestPublicAction}
      onWithdrawPublic={withdrawPublicAction}
    />
  );
}
