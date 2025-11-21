"use server";

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { db } from '@/db/drizzle';
import { agent, homeRow, homeRowAgent } from '@/db/schema';
import { and, asc, eq, ilike, inArray, notInArray, or, sql } from 'drizzle-orm';
import type { HomeRowWithAgents } from '@/types/homeRows';

function sanitizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\- ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function clampPageSize(pageSize?: number, defaultSize = 12, maxSize = 50) {
  const numeric = Number(pageSize);
  if (!Number.isFinite(numeric) || numeric <= 0) return defaultSize;
  return Math.max(1, Math.min(Math.floor(numeric), maxSize));
}

function sanitizeMaxItems(value?: number | null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

export async function listHomeRows(options?: { includeUnpublished?: boolean }): Promise<HomeRowWithAgents[]> {
  const includeUnpublished = options?.includeUnpublished ?? false;

  let query = db
    .select({
      id: homeRow.id,
      title: homeRow.title,
      slug: homeRow.slug,
      description: homeRow.description,
      isPublished: homeRow.isPublished,
      sortOrder: homeRow.sortOrder,
      maxItems: homeRow.maxItems,
      agentTag: homeRowAgent.agentTag,
      agentSort: homeRowAgent.sortOrder,
      agentName: agent.name,
      agentAvatar: agent.avatar,
      agentTagline: agent.tagline,
      agentModel: agent.model,
      agentSystemPrompt: agent.systemPrompt,
      agentVisibility: agent.visibility,
    })
    .from(homeRow)
    .leftJoin(homeRowAgent, eq(homeRow.id, homeRowAgent.rowId))
    .leftJoin(agent, eq(homeRowAgent.agentTag, agent.tag));

  if (!includeUnpublished) {
    query = query.where(eq(homeRow.isPublished, true));
  }

  query = query.orderBy(
    asc(homeRow.sortOrder),
    asc(homeRow.createdAt),
    asc(homeRowAgent.sortOrder),
    asc(homeRowAgent.createdAt)
  );

  const rows = await query;
  const grouped = new Map<string, HomeRowWithAgents>();

  for (const row of rows) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description ?? null,
        isPublished: row.isPublished,
        sortOrder: row.sortOrder,
        maxItems: row.maxItems ?? null,
        agents: [],
      });
    }
    const isPublicAgent = row.agentVisibility === 'public';
    if (row.agentTag && row.agentName && (includeUnpublished || isPublicAgent)) {
      const current = grouped.get(row.id)!;
      if (!current.maxItems || current.agents.length < current.maxItems) {
        current.agents.push({
          tag: row.agentTag,
          name: row.agentName,
          avatar: row.agentAvatar,
          tagline: row.agentTagline,
          model: row.agentModel,
          systemPrompt: row.agentSystemPrompt,
          visibility: row.agentVisibility,
        });
      }
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createHomeRow(input: { title: string; slug?: string; description?: string | null; isPublished?: boolean; maxItems?: number | null }) {
  const title = input.title?.trim();
  if (!title) return { ok: false, error: 'Title is required' };

  const slug = sanitizeSlug(input.slug || title);
  if (!slug) return { ok: false, error: 'Slug is required' };

  const [{ maxValue }] = await db
    .select({ maxValue: sql<number>`coalesce(max(${homeRow.sortOrder}), 0)` })
    .from(homeRow);

  const id = randomUUID();
  const cleanedMax = sanitizeMaxItems(input.maxItems);
  const rows = await db
    .insert(homeRow)
    .values({
      id,
      title,
      slug,
      description: input.description ?? null,
      isPublished: input.isPublished ?? false,
      sortOrder: (maxValue ?? 0) + 1,
      maxItems: cleanedMax,
    })
    .onConflictDoNothing()
    .returning({ id: homeRow.id });

  if (!rows[0]?.id) {
    return { ok: false, error: 'Row with this slug already exists' };
  }

  revalidatePath('/');
  return { ok: true, id };
}

export async function updateHomeRow(input: { id: string; title?: string; slug?: string; description?: string | null; isPublished?: boolean; maxItems?: number | null }) {
  if (!input.id) return { ok: false, error: 'Missing row id' };

  const values: typeof homeRow.$inferInsert = { updatedAt: new Date() };
  if (typeof input.title === 'string') values.title = input.title.trim();
  if (typeof input.slug === 'string') values.slug = sanitizeSlug(input.slug);
  if (input.description !== undefined) values.description = input.description ?? null;
  if (typeof input.isPublished === 'boolean') values.isPublished = input.isPublished;
  if (input.maxItems !== undefined) values.maxItems = sanitizeMaxItems(input.maxItems);

  if (Object.keys(values).length <= 1) return { ok: true };

  await db.update(homeRow).set(values).where(eq(homeRow.id, input.id));
  revalidatePath('/');
  return { ok: true };
}

export async function deleteHomeRow(id: string) {
  if (!id) return { ok: false, error: 'Missing row id' };
  await db.delete(homeRow).where(eq(homeRow.id, id));
  revalidatePath('/');
  return { ok: true };
}

export async function setHomeRowOrder(orderIds: string[]) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) return { ok: false, error: 'Missing order' };
  const updates = orderIds.map((rowId, index) =>
    db.update(homeRow).set({ sortOrder: index, updatedAt: new Date() }).where(eq(homeRow.id, rowId))
  );
  await Promise.all(updates);
  revalidatePath('/');
  return { ok: true };
}

export async function setHomeRowAgents(rowId: string, agentTags: string[]) {
  if (!rowId) return { ok: false, error: 'Missing row id' };
  if (!Array.isArray(agentTags)) return { ok: false, error: 'Invalid agent list' };

  const trimmed = agentTags
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const unique = Array.from(new Set(trimmed));
  if (unique.length === 0) {
    await db.delete(homeRowAgent).where(eq(homeRowAgent.rowId, rowId));
    revalidatePath('/');
    return { ok: true };
  }

  const existingAgents = await db
    .select({ tag: agent.tag })
    .from(agent)
    .where(and(inArray(agent.tag, unique), eq(agent.visibility, 'public')));
  const validTags = existingAgents.map((a) => a.tag);

  await db.delete(homeRowAgent).where(eq(homeRowAgent.rowId, rowId));

  const values = validTags.map((tag, index) => ({
    rowId,
    agentTag: tag,
    sortOrder: index,
  }));

  if (values.length > 0) {
    await db.insert(homeRowAgent).values(values);
  }

  revalidatePath('/');
  return { ok: true };
}

export interface PaginatedAgentsResult {
  agents: typeof agent.$inferSelect[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAgentsPaginated(options: { query?: string; page?: number; pageSize?: number; excludeTags?: string[] } = {}): Promise<PaginatedAgentsResult> {
  const pageSize = clampPageSize(options.pageSize, 12);
  const parsedPage = Number(options.page ?? 1);
  const requestedPage = Math.max(1, Number.isFinite(parsedPage) ? Math.floor(parsedPage) : 1);

  const filters = [eq(agent.visibility, 'public')];
  const trimmed = typeof options.query === 'string' ? options.query.trim() : '';
  if (trimmed) {
    const pattern = `%${trimmed}%`;
    filters.push(
      or(
        ilike(agent.name, pattern),
        ilike(agent.tag, pattern),
        ilike(agent.systemPrompt, pattern)
      )
    );
  }

  if (options.excludeTags && options.excludeTags.length > 0) {
    filters.push(notInArray(agent.tag, options.excludeTags));
  }

  const whereClause = filters.length ? and(...filters) : undefined;

  let query = db.select().from(agent);
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(agent);

  if (whereClause) {
    query = query.where(whereClause);
    countQuery = countQuery.where(whereClause);
  }

  const [{ count }] = await countQuery;
  const total = Number(count ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
  const offset = (safePage - 1) * pageSize;

  const rows = total > 0 ? await query.limit(pageSize).offset(offset) : [];

  return {
    agents: rows,
    total,
    page: safePage,
    pageSize,
  };
}

export async function searchAgentsForHomeRow(query: string, limit = 10) {
  const search = (query || '').trim();
  const pageSize = clampPageSize(limit, 10, 50);

  let base = db
    .select({
      tag: agent.tag,
      name: agent.name,
      avatar: agent.avatar,
      tagline: agent.tagline,
      model: agent.model,
      systemPrompt: agent.systemPrompt,
    })
    .from(agent)
    .where(eq(agent.visibility, 'public'))
    .orderBy(asc(agent.name))
    .limit(pageSize);

  if (search) {
    const pattern = `%${search}%`;
    base = base.where(and(eq(agent.visibility, 'public'), or(ilike(agent.name, pattern), ilike(agent.tag, pattern))));
  }

  return base;
}
