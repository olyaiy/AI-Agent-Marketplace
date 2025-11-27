"use server";

import { randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/drizzle';
import { agent } from '@/db/schema';
import { and, eq, ilike, inArray, notInArray, or, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

type AgentVisibility = 'public' | 'invite_only' | 'private';
type PublishStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

const allowedVisibilities: AgentVisibility[] = ['public', 'invite_only', 'private'];

export interface CreateAgentInput {
  tag: string;
  name: string;
  systemPrompt: string;
  model?: string;
  secondaryModels?: string[];
  avatar?: string; // filename in /public/avatar
  tagline?: string;
  description?: string;
  visibility?: AgentVisibility;
}

function sanitizeVisibility(value?: string | null): AgentVisibility {
  if (typeof value !== 'string') return 'private';
  const normalized = value.trim().toLowerCase();
  return allowedVisibilities.includes(normalized as AgentVisibility) ? (normalized as AgentVisibility) : 'private';
}

function generateInviteCode() {
  return randomBytes(8).toString('hex');
}

function normalizeModelIds(list?: string[] | null): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    let val = raw.trim();
    if (!val) continue;
    val = val.replace(/\s+/g, '');
    val = val.replace(':', '/');
    if (!val.includes('/')) continue;
    if (seen.has(val)) continue;
    seen.add(val);
    out.push(val);
    if (out.length >= 16) break; // guardrail to avoid unbounded lists
  }
  return out;
}

function isApprovedPublic(row: { visibility: string | null; publishStatus?: string | null }) {
  return row.visibility === 'public' && row.publishStatus === 'approved';
}

async function getSessionFromHeaders() {
  const headerList = await headers();
  return auth.api.getSession({ headers: headerList }).catch(() => null);
}

export async function createAgent(input: CreateAgentInput) {
  const { tag, name, systemPrompt, model, secondaryModels, avatar, tagline, description } = input;
  if (!tag || !name || !systemPrompt) return { ok: false, error: 'Missing fields' };

  const session = await getSessionFromHeaders();
  const userId = session?.user?.id ?? null;
  const userRole = session?.user?.role ?? null;
  const isAdmin = userRole === 'admin';

  const values: {
    tag: string;
    name: string;
    systemPrompt: string;
    model?: string;
    secondaryModels?: string[];
    avatar?: string;
    tagline?: string | null;
    description?: string | null;
    creatorId?: string | null;
    visibility?: AgentVisibility;
    inviteCode?: string | null;
    publishStatus?: PublishStatus;
    publishRequestedAt?: Date | null;
    publishRequestedBy?: string | null;
    publishReviewedAt?: Date | null;
    publishReviewedBy?: string | null;
  } = { tag, name, systemPrompt };

  if (userId) {
    values.creatorId = userId;
  }

  const requestedVisibility = sanitizeVisibility(input.visibility);
  let nextVisibility: AgentVisibility = requestedVisibility === 'public' ? 'invite_only' : requestedVisibility;
  let publishStatus: PublishStatus = 'draft';
  let publishRequestedAt: Date | null = null;
  let publishRequestedBy: string | null = null;
  let publishReviewedAt: Date | null = null;
  let publishReviewedBy: string | null = null;

  if (requestedVisibility === 'public') {
    if (isAdmin) {
      nextVisibility = 'public';
      publishStatus = 'approved';
      const now = new Date();
      publishReviewedAt = now;
      publishReviewedBy = userId;
    } else {
      nextVisibility = 'invite_only';
      publishStatus = 'pending_review';
      const now = new Date();
      publishRequestedAt = now;
      publishRequestedBy = userId;
    }
  }

  values.visibility = nextVisibility;
  values.publishStatus = publishStatus;
  values.publishRequestedAt = publishRequestedAt;
  values.publishRequestedBy = publishRequestedBy;
  values.publishReviewedAt = publishReviewedAt;
  values.publishReviewedBy = publishReviewedBy;

  if (typeof model === 'string' && model.trim().length > 0) {
    values.model = model.trim();
  }
  const normalizedSecondary = normalizeModelIds(secondaryModels);
  if (normalizedSecondary.length > 0) {
    values.secondaryModels = normalizedSecondary;
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
  if (nextVisibility === 'invite_only') {
    values.inviteCode = generateInviteCode();
  }

  await db.insert(agent).values(values);
  return { ok: true, publishStatus };
}

export async function getAgentByTag(tag: string) {
  const rows = await db.select().from(agent).where(eq(agent.tag, tag)).limit(1);
  return rows[0] ?? null;
}

type AgentForViewerResult =
  | { agent: typeof agent.$inferSelect; reason: 'ok'; inviteAccepted: boolean }
  | { agent: null; reason: 'not_found' | 'forbidden'; inviteAccepted: false };

export async function getAgentForViewer(options: { tag: string; userId?: string | null; userRole?: string | null; inviteCode?: string | null }): Promise<AgentForViewerResult> {
  const rows = await db.select().from(agent).where(eq(agent.tag, options.tag)).limit(1);
  const found = rows[0];
  if (!found) return { agent: null, reason: 'not_found', inviteAccepted: false };

  const isAdmin = options.userRole === 'admin';
  const isOwner = Boolean(options.userId && found.creatorId && options.userId === found.creatorId);
  const inviteMatches = Boolean(found.inviteCode && options.inviteCode && found.inviteCode === options.inviteCode);
  const isPublic = isApprovedPublic(found);

  const allowed =
    isPublic ||
    (found.visibility === 'public' && !isPublic && (isOwner || isAdmin)) ||
    (found.visibility === 'invite_only' && (inviteMatches || isOwner || isAdmin)) ||
    (found.visibility === 'private' && (isOwner || isAdmin));

  if (!allowed) return { agent: null, reason: 'forbidden', inviteAccepted: false };

  return { agent: found, reason: 'ok', inviteAccepted: inviteMatches };
}

export async function listAgents(query?: string) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  const visibilityFilter = and(eq(agent.visibility, 'public'), eq(agent.publishStatus, 'approved'));
  if (!trimmed) return db.select().from(agent).where(visibilityFilter);

  const pattern = `%${trimmed}%`;
  return db
    .select()
    .from(agent)
    .where(
      and(
        visibilityFilter,
        or(
          ilike(agent.name, pattern),
          ilike(agent.tag, pattern),
          ilike(agent.systemPrompt, pattern)
        )
      )
    );
}

export interface UpdateAgentInput {
  tag: string;
  name?: string;
  systemPrompt?: string;
  model?: string;
  secondaryModels?: string[];
  avatar?: string;
  tagline?: string | null;
  description?: string | null;
  visibility?: AgentVisibility;
  actorId?: string | null;
  actorRole?: string | null;
  requestPublic?: boolean;
  withdrawPublicRequest?: boolean;
}

export async function updateAgent(input: UpdateAgentInput) {
  const { tag, name, systemPrompt, model, secondaryModels, avatar, tagline, description, actorId, actorRole } = input;
  if (!tag) return { ok: false, error: 'Missing tag' };

  const currentRows = await db
    .select({
      visibility: agent.visibility,
      inviteCode: agent.inviteCode,
      publishStatus: agent.publishStatus,
      publishRequestedAt: agent.publishRequestedAt,
      publishRequestedBy: agent.publishRequestedBy,
      publishReviewedAt: agent.publishReviewedAt,
      publishReviewedBy: agent.publishReviewedBy,
      publishReviewNotes: agent.publishReviewNotes,
    })
    .from(agent)
    .where(eq(agent.tag, tag))
    .limit(1);
  const current = currentRows[0];
  if (!current) return { ok: false, error: 'Agent not found' };

  const isAdmin = actorRole === 'admin';

  let nextVisibility: AgentVisibility = sanitizeVisibility(current.visibility);
  let nextPublishStatus: PublishStatus = (current.publishStatus as PublishStatus) || 'draft';
  let publishRequestedAt = current.publishRequestedAt ?? null;
  let publishRequestedBy = current.publishRequestedBy ?? null;
  let publishReviewedAt = current.publishReviewedAt ?? null;
  let publishReviewedBy = current.publishReviewedBy ?? null;
  let publishReviewNotes = current.publishReviewNotes ?? null;

  if (input.visibility !== undefined) {
    const requestedVisibility = sanitizeVisibility(input.visibility);
    if (requestedVisibility === 'public') {
      if (isAdmin) {
        nextVisibility = 'public';
        nextPublishStatus = 'approved';
        const now = new Date();
        publishReviewedAt = now;
        publishReviewedBy = actorId ?? null;
      } else {
        nextVisibility = 'invite_only';
        nextPublishStatus = 'pending_review';
        const now = new Date();
        publishRequestedAt = now;
        publishRequestedBy = actorId ?? null;
        publishReviewedAt = null;
        publishReviewedBy = null;
        publishReviewNotes = null;
      }
    } else {
      nextVisibility = requestedVisibility;
      if (nextPublishStatus !== 'approved') {
        nextPublishStatus = 'draft';
        publishRequestedAt = null;
        publishRequestedBy = null;
        publishReviewedAt = null;
        publishReviewedBy = null;
        publishReviewNotes = null;
      }
    }
  }

  if (input.requestPublic) {
    if (isAdmin) {
      nextVisibility = 'public';
      nextPublishStatus = 'approved';
      const now = new Date();
      publishReviewedAt = now;
      publishReviewedBy = actorId ?? null;
    } else {
      nextVisibility = 'invite_only';
      nextPublishStatus = 'pending_review';
      const now = new Date();
      publishRequestedAt = now;
      publishRequestedBy = actorId ?? null;
      publishReviewedAt = null;
      publishReviewedBy = null;
      publishReviewNotes = null;
    }
  }

  if (input.withdrawPublicRequest) {
    nextPublishStatus = 'draft';
    publishRequestedAt = null;
    publishRequestedBy = null;
    publishReviewedAt = null;
    publishReviewedBy = null;
    publishReviewNotes = null;
    if (nextVisibility === 'public' && !isAdmin) {
      nextVisibility = 'invite_only';
    }
  }

  if (nextVisibility === 'public' && nextPublishStatus !== 'approved' && !isAdmin) {
    nextVisibility = 'invite_only';
  }

  const values: {
    name?: string;
    systemPrompt?: string;
    model?: string;
    secondaryModels?: string[];
    avatar?: string | null;
    tagline?: string | null;
    description?: string | null;
    visibility?: AgentVisibility;
    inviteCode?: string | null;
    publishStatus?: PublishStatus;
    publishRequestedAt?: Date | null;
    publishRequestedBy?: string | null;
    publishReviewedAt?: Date | null;
    publishReviewedBy?: string | null;
    publishReviewNotes?: string | null;
    updatedAt?: Date;
  } = {};

  if (typeof name === 'string') values.name = name;
  if (typeof systemPrompt === 'string') values.systemPrompt = systemPrompt;
  if (typeof model === 'string' && model.trim().length > 0) values.model = model.trim();
  if (Array.isArray(secondaryModels)) {
    values.secondaryModels = normalizeModelIds(secondaryModels);
  }
  if (typeof avatar === 'string') values.avatar = avatar.trim().length > 0 ? avatar.trim() : null;
  if (typeof tagline === 'string' || tagline === null) values.tagline = tagline && tagline.trim ? (tagline.trim().length > 0 ? tagline.trim() : null) : tagline;
  if (typeof description === 'string' || description === null) values.description = description && description.trim ? (description.trim().length > 0 ? description.trim() : null) : description;

  values.visibility = nextVisibility;
  values.inviteCode = nextVisibility === 'invite_only'
    ? current.inviteCode || generateInviteCode()
    : null;
  values.publishStatus = nextPublishStatus;
  values.publishRequestedAt = publishRequestedAt;
  values.publishRequestedBy = publishRequestedBy;
  values.publishReviewedAt = publishReviewedAt;
  values.publishReviewedBy = publishReviewedBy;
  values.publishReviewNotes = publishReviewNotes;

  if (!Object.keys(values).length) return { ok: true };
  values.updatedAt = new Date();
  await db.update(agent).set(values).where(eq(agent.tag, tag));
  return { ok: true, publishStatus: nextPublishStatus };
}

export async function deleteAgent(tag: string) {
  if (!tag) return { ok: false, error: 'Missing tag' };
  await db.delete(agent).where(eq(agent.tag, tag));
  return { ok: true };
}

export async function getAgentsByCreator(creatorId: string) {
  if (!creatorId) return [];
  return db.select().from(agent).where(eq(agent.creatorId, creatorId));
}

export async function requestAgentReview(tag: string, actorId?: string | null, actorRole?: string | null) {
  if (!tag) return { ok: false, error: 'Missing tag' };
  const rows = await db
    .select({ creatorId: agent.creatorId, visibility: agent.visibility, inviteCode: agent.inviteCode, publishStatus: agent.publishStatus })
    .from(agent)
    .where(eq(agent.tag, tag))
    .limit(1);
  const current = rows[0];
  if (!current) return { ok: false, error: 'Agent not found' };

  const isAdmin = actorRole === 'admin';
  const isOwner = Boolean(actorId && current.creatorId && actorId === current.creatorId);
  if (!isAdmin && !isOwner) return { ok: false, error: 'Forbidden' };

  const inviteCode = current.inviteCode || generateInviteCode();
  const now = new Date();
  await db
    .update(agent)
    .set({
      visibility: 'invite_only',
      inviteCode,
      publishStatus: 'pending_review',
      publishRequestedAt: now,
      publishRequestedBy: actorId ?? null,
      publishReviewedAt: null,
      publishReviewedBy: null,
      publishReviewNotes: null,
      updatedAt: now,
    })
    .where(eq(agent.tag, tag));
  return { ok: true };
}

export async function withdrawAgentReview(tag: string, actorId?: string | null, actorRole?: string | null) {
  if (!tag) return { ok: false, error: 'Missing tag' };
  const rows = await db
    .select({ creatorId: agent.creatorId, visibility: agent.visibility })
    .from(agent)
    .where(eq(agent.tag, tag))
    .limit(1);
  const current = rows[0];
  if (!current) return { ok: false, error: 'Agent not found' };

  const isAdmin = actorRole === 'admin';
  const isOwner = Boolean(actorId && current.creatorId && actorId === current.creatorId);
  if (!isAdmin && !isOwner) return { ok: false, error: 'Forbidden' };

  const now = new Date();
  await db
    .update(agent)
    .set({
      visibility: current.visibility === 'private' ? 'private' : 'invite_only',
      publishStatus: 'draft',
      publishRequestedAt: null,
      publishRequestedBy: null,
      publishReviewedAt: null,
      publishReviewedBy: null,
      publishReviewNotes: null,
      updatedAt: now,
    })
    .where(eq(agent.tag, tag));
  return { ok: true };
}

export async function approveAgentForPublic(tag: string, adminId: string, notes?: string | null) {
  if (!tag || !adminId) return { ok: false, error: 'Missing fields' };
  const now = new Date();
  const updated = await db
    .update(agent)
    .set({
      visibility: 'public',
      publishStatus: 'approved',
      publishReviewedAt: now,
      publishReviewedBy: adminId,
      publishReviewNotes: notes ?? null,
      updatedAt: now,
    })
    .where(eq(agent.tag, tag))
    .returning({ tag: agent.tag });
  if (!updated[0]) return { ok: false, error: 'Agent not found' };
  revalidatePath('/');
  return { ok: true };
}

export async function rejectAgentForPublic(tag: string, adminId: string, notes?: string | null) {
  if (!tag || !adminId) return { ok: false, error: 'Missing fields' };
  const rows = await db
    .select({ inviteCode: agent.inviteCode })
    .from(agent)
    .where(eq(agent.tag, tag))
    .limit(1);
  const current = rows[0];
  if (!current) return { ok: false, error: 'Agent not found' };

  const now = new Date();
  await db
    .update(agent)
    .set({
      visibility: 'invite_only',
      inviteCode: current.inviteCode || generateInviteCode(),
      publishStatus: 'rejected',
      publishReviewedAt: now,
      publishReviewedBy: adminId,
      publishReviewNotes: notes ?? null,
      updatedAt: now,
    })
    .where(eq(agent.tag, tag));
  revalidatePath('/');
  return { ok: true };
}

export async function listAgentApprovalQueue(statuses: PublishStatus[] = ['pending_review']) {
  const filteredStatuses = statuses.length ? statuses : ['pending_review'];
  return db
    .select({
      tag: agent.tag,
      name: agent.name,
      creatorId: agent.creatorId,
      visibility: agent.visibility,
      publishStatus: agent.publishStatus,
      publishRequestedAt: agent.publishRequestedAt,
      publishRequestedBy: agent.publishRequestedBy,
      publishReviewedAt: agent.publishReviewedAt,
      publishReviewedBy: agent.publishReviewedBy,
      publishReviewNotes: agent.publishReviewNotes,
      tagline: agent.tagline,
      description: agent.description,
      model: agent.model,
      systemPrompt: agent.systemPrompt,
    })
    .from(agent)
    .where(inArray(agent.publishStatus, filteredStatuses));
}

export interface PaginatedAgentsResult {
  agents: typeof agent.$inferSelect[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAgentsPaginated(options: { query?: string; page?: number; pageSize?: number; excludeTags?: string[] } = {}): Promise<PaginatedAgentsResult> {
  const pageSize = (() => {
    const numeric = Number(options.pageSize);
    if (!Number.isFinite(numeric) || numeric <= 0) return 12;
    return Math.max(1, Math.min(Math.floor(numeric), 50));
  })();
  const parsedPage = Number(options.page ?? 1);
  const requestedPage = Math.max(1, Number.isFinite(parsedPage) ? Math.floor(parsedPage) : 1);

  const filters = [eq(agent.visibility, 'public'), eq(agent.publishStatus, 'approved')];
  const trimmed = typeof options.query === 'string' ? options.query.trim() : '';
  if (trimmed) {
    const pattern = `%${trimmed}%`;
    const searchFilter = or(
      ilike(agent.name, pattern),
      ilike(agent.tag, pattern),
      ilike(agent.systemPrompt, pattern)
    );
    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  if (options.excludeTags && options.excludeTags.length > 0) {
    filters.push(notInArray(agent.tag, options.excludeTags));
  }

  const whereClause = filters.length ? and(...filters) : undefined;

  const baseQuery = db.select().from(agent);
  const baseCountQuery = db.select({ count: sql<number>`count(*)` }).from(agent);

  const filteredQuery = whereClause ? baseQuery.where(whereClause) : baseQuery;
  const filteredCountQuery = whereClause ? baseCountQuery.where(whereClause) : baseCountQuery;

  const [{ count }] = await filteredCountQuery;
  const total = Number(count ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
  const offset = (safePage - 1) * pageSize;

  const rows = total > 0 ? await filteredQuery.limit(pageSize).offset(offset) : [];

  return {
    agents: rows,
    total,
    page: safePage,
    pageSize,
  };
}
