"use server";

import { db } from '@/db/drizzle';
import { agent } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface CreateAgentInput {
  tag: string;
  name: string;
  systemPrompt: string;
}

export async function createAgent(input: CreateAgentInput) {
  const { tag, name, systemPrompt } = input;
  if (!tag || !name || !systemPrompt) return { ok: false, error: 'Missing fields' };

  await db.insert(agent).values({ tag, name, systemPrompt });
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
}

export async function updateAgent(input: UpdateAgentInput) {
  const { tag, name, systemPrompt } = input;
  if (!tag) return { ok: false, error: 'Missing tag' };
  const values: { name?: string; systemPrompt?: string } = {};
  if (typeof name === 'string') values.name = name;
  if (typeof systemPrompt === 'string') values.systemPrompt = systemPrompt;
  if (!Object.keys(values).length) return { ok: true };
  await db.update(agent).set(values).where(eq(agent.tag, tag));
  return { ok: true };
}

export async function deleteAgent(tag: string) {
  if (!tag) return { ok: false, error: 'Missing tag' };
  await db.delete(agent).where(eq(agent.tag, tag));
  return { ok: true };
}
