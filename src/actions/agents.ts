"use server";

import { db } from '@/db/drizzle';
import { agent } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface CreateAgentInput {
  tag: string;
  name: string;
  systemPrompt: string;
  model?: string;
  avatar?: string; // filename in /public/avatar
}

export async function createAgent(input: CreateAgentInput) {
  const { tag, name, systemPrompt, model, avatar } = input;
  if (!tag || !name || !systemPrompt) return { ok: false, error: 'Missing fields' };

  const values: { tag: string; name: string; systemPrompt: string; model?: string; avatar?: string } = { tag, name, systemPrompt };
  if (typeof model === 'string' && model.trim().length > 0) {
    values.model = model.trim();
  }
  if (typeof avatar === 'string' && avatar.trim().length > 0) {
    values.avatar = avatar.trim();
  }
  await db.insert(agent).values(values);
  return { ok: true };
}

export async function getAgentByTag(tag: string) {
  const rows = await db.select().from(agent).where(eq(agent.tag, tag)).limit(1);
  return rows[0] ?? null;
}

export async function listAgents() {
  return db.select().from(agent);
}

export interface UpdateAgentInput {
  tag: string;
  name?: string;
  systemPrompt?: string;
  model?: string;
  avatar?: string;
}

export async function updateAgent(input: UpdateAgentInput) {
  const { tag, name, systemPrompt, model, avatar } = input;
  if (!tag) return { ok: false, error: 'Missing tag' };
  const values: { name?: string; systemPrompt?: string; model?: string; avatar?: string | null } = {};
  if (typeof name === 'string') values.name = name;
  if (typeof systemPrompt === 'string') values.systemPrompt = systemPrompt;
  if (typeof model === 'string' && model.trim().length > 0) values.model = model.trim();
  if (typeof avatar === 'string') values.avatar = avatar.trim().length > 0 ? avatar.trim() : null;
  if (!Object.keys(values).length) return { ok: true };
  await db.update(agent).set(values).where(eq(agent.tag, tag));
  return { ok: true };
}

export async function deleteAgent(tag: string) {
  if (!tag) return { ok: false, error: 'Missing tag' };
  await db.delete(agent).where(eq(agent.tag, tag));
  return { ok: true };
}
