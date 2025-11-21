"use server";

import { randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { db } from '@/db/drizzle';
import { agent } from '@/db/schema';
import { and, eq, ilike, or } from 'drizzle-orm';
import { auth } from '@/lib/auth';

type AgentVisibility = 'public' | 'invite_only' | 'private';
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
  if (typeof value !== 'string') return 'public';
  const normalized = value.trim().toLowerCase();
  return allowedVisibilities.includes(normalized as AgentVisibility) ? (normalized as AgentVisibility) : 'public';
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

export async function createAgent(input: CreateAgentInput) {
  const { tag, name, systemPrompt, model, secondaryModels, avatar, tagline, description } = input;
  if (!tag || !name || !systemPrompt) return { ok: false, error: 'Missing fields' };

  // Get current user session
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  const userId = session?.user?.id;

  // If no user is authenticated, you can either:
  // 1. Return an error (uncomment the line below)
  // if (!userId) return { ok: false, error: 'Authentication required' };
  // 2. Allow creation without a creator (current behavior - creatorId will be null)

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
  } = { tag, name, systemPrompt };
  if (userId) {
    values.creatorId = userId;
  }
  const visibility = userId ? sanitizeVisibility(input.visibility) : 'public';
  values.visibility = visibility;
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
  if (visibility === 'invite_only') {
    values.inviteCode = generateInviteCode();
  }
  await db.insert(agent).values(values);
  return { ok: true };
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

  const allowed =
    found.visibility === 'public' ||
    (found.visibility === 'invite_only' && (inviteMatches || isOwner || isAdmin)) ||
    (found.visibility === 'private' && (isOwner || isAdmin));

  if (!allowed) return { agent: null, reason: 'forbidden', inviteAccepted: false };

  return { agent: found, reason: 'ok', inviteAccepted: inviteMatches };
}

export async function listAgents(query?: string) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  const visibilityFilter = eq(agent.visibility, 'public');
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
}

export async function updateAgent(input: UpdateAgentInput) {
  const { tag, name, systemPrompt, model, secondaryModels, avatar, tagline, description } = input;
  if (!tag) return { ok: false, error: 'Missing tag' };
  const currentRows = await db
    .select({ visibility: agent.visibility, inviteCode: agent.inviteCode })
    .from(agent)
    .where(eq(agent.tag, tag))
    .limit(1);
  const current = currentRows[0];
  if (!current) return { ok: false, error: 'Agent not found' };

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

  if (input.visibility !== undefined) {
    const nextVisibility = sanitizeVisibility(input.visibility);
    values.visibility = nextVisibility;
    values.inviteCode = nextVisibility === 'invite_only'
      ? current.inviteCode || generateInviteCode()
      : null;
  }

  if (!Object.keys(values).length) return { ok: true };
  values.updatedAt = new Date();
  await db.update(agent).set(values).where(eq(agent.tag, tag));
  return { ok: true };
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
