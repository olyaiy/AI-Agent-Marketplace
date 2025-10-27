"use server";

import { db } from '@/db/drizzle';
import { knowledgebase, agentKnowledge } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export interface CreateKnowledgeInput {
  agentTag: string;
  name: string;
  content: string;
  type?: string;
}

export async function createKnowledge(input: CreateKnowledgeInput) {
  const { agentTag, name, content, type = 'text' } = input;
  if (!agentTag || !name || !content) {
    return { ok: false, error: 'Missing required fields' };
  }

  const knowledgeId = randomUUID();

  // Create the knowledge item
  await db.insert(knowledgebase).values({
    id: knowledgeId,
    name,
    content,
    type,
  });

  // Link it to the agent
  await db.insert(agentKnowledge).values({
    agentTag,
    knowledgeId,
  });

  return { ok: true, id: knowledgeId };
}

export interface UpdateKnowledgeInput {
  id: string;
  name?: string;
  content?: string;
  type?: string;
}

export async function updateKnowledge(input: UpdateKnowledgeInput) {
  const { id, name, content, type } = input;
  if (!id) return { ok: false, error: 'Missing knowledge ID' };

  const values: { name?: string; content?: string; type?: string; updatedAt?: Date } = {};
  if (typeof name === 'string') values.name = name;
  if (typeof content === 'string') values.content = content;
  if (typeof type === 'string') values.type = type;

  if (!Object.keys(values).length) return { ok: true };

  values.updatedAt = new Date();
  await db.update(knowledgebase).set(values).where(eq(knowledgebase.id, id));

  return { ok: true };
}

export async function deleteKnowledge(id: string) {
  if (!id) return { ok: false, error: 'Missing knowledge ID' };

  // Delete the knowledge item (cascade will handle agentKnowledge entries)
  await db.delete(knowledgebase).where(eq(knowledgebase.id, id));

  return { ok: true };
}

export async function getKnowledgeByAgent(agentTag: string) {
  if (!agentTag) return [];

  const results = await db
    .select({
      id: knowledgebase.id,
      name: knowledgebase.name,
      content: knowledgebase.content,
      type: knowledgebase.type,
      createdAt: knowledgebase.createdAt,
      updatedAt: knowledgebase.updatedAt,
    })
    .from(knowledgebase)
    .innerJoin(agentKnowledge, eq(agentKnowledge.knowledgeId, knowledgebase.id))
    .where(eq(agentKnowledge.agentTag, agentTag));

  return results;
}

export async function getKnowledgeById(id: string) {
  if (!id) return null;

  const rows = await db
    .select()
    .from(knowledgebase)
    .where(eq(knowledgebase.id, id))
    .limit(1);

  return rows[0] ?? null;
}

