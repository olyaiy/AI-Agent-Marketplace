"use server";

import { db } from '@/db/drizzle';
import { agent } from '@/db/schema';
import { eq, ilike, or } from 'drizzle-orm';

export interface CreateAgentInput {
  tag: string;
  name: string;
  systemPrompt: string;
  model?: string;
  avatar?: string; // filename in /public/avatar
  tagline?: string;
  description?: string;
}

export async function createAgent(input: CreateAgentInput) {
  const { tag, name, systemPrompt, model, avatar, tagline, description } = input;
  if (!tag || !name || !systemPrompt) return { ok: false, error: 'Missing fields' };

  const values: { tag: string; name: string; systemPrompt: string; model?: string; avatar?: string; tagline?: string | null; description?: string | null } = { tag, name, systemPrompt } as any;
  if (typeof model === 'string' && model.trim().length > 0) {
    values.model = model.trim();
  }
  if (typeof avatar === 'string' && avatar.trim().length > 0) {
    values.avatar = avatar.trim();
  }
  if (typeof tagline === 'string') {
    const t = tagline.trim();
    values.tagline = t.length > 0 ? t : null;
  }
  if (typeof description === 'string') {
    const d = description.trim();
    values.description = d.length > 0 ? d : null;
  }
  await db.insert(agent).values(values);
  return { ok: true };
}

export async function getAgentByTag(tag: string) {
  const rows = await db.select().from(agent).where(eq(agent.tag, tag)).limit(1);
  return rows[0] ?? null;
}

export async function listAgents(query?: string) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (!trimmed) return db.select().from(agent);

  const pattern = `%${trimmed}%`;
  return db
    .select()
    .from(agent)
    .where(
      or(
        ilike(agent.name, pattern),
        ilike(agent.tag, pattern),
        ilike(agent.systemPrompt, pattern)
      )
    );
}

export interface UpdateAgentInput {
  tag: string;
  name?: string;
  systemPrompt?: string;
  model?: string;
  avatar?: string;
  tagline?: string | null;
  description?: string | null;
}

export async function updateAgent(input: UpdateAgentInput) {
  const { tag, name, systemPrompt, model, avatar, tagline, description } = input;
  if (!tag) return { ok: false, error: 'Missing tag' };
  const values: { name?: string; systemPrompt?: string; model?: string; avatar?: string | null; tagline?: string | null; description?: string | null } = {};
  if (typeof name === 'string') values.name = name;
  if (typeof systemPrompt === 'string') values.systemPrompt = systemPrompt;
  if (typeof model === 'string' && model.trim().length > 0) values.model = model.trim();
  if (typeof avatar === 'string') values.avatar = avatar.trim().length > 0 ? avatar.trim() : null;
  if (typeof tagline === 'string' || tagline === null) values.tagline = tagline && tagline.trim ? (tagline.trim().length > 0 ? tagline.trim() : null) : tagline;
  if (typeof description === 'string' || description === null) values.description = description && description.trim ? (description.trim().length > 0 ? description.trim() : null) : description;
  if (!Object.keys(values).length) return { ok: true };
  await db.update(agent).set(values).where(eq(agent.tag, tag));
  return { ok: true };
}

export async function deleteAgent(tag: string) {
  if (!tag) return { ok: false, error: 'Missing tag' };
  await db.delete(agent).where(eq(agent.tag, tag));
  return { ok: true };
}
