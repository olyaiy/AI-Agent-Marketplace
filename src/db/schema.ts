import { pgTable, text, varchar, boolean, timestamp, jsonb, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const agent = pgTable('agent', {
  tag: varchar('tag', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  model: varchar('model', { length: 128 }).notNull().default('openai/gpt-5-mini'),
  secondaryModels: jsonb('secondary_models').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  avatar: varchar('avatar', { length: 256 }),
  tagline: text('tagline'),
  description: text('description'),
  visibility: varchar('visibility', { length: 16 }).notNull().default('private'),
  inviteCode: varchar('invite_code', { length: 64 }),
  publishStatus: varchar('publish_status', { length: 32 }).notNull().default('draft'), // draft | pending_review | approved | rejected
  publishRequestedAt: timestamp('publish_requested_at'),
  publishRequestedBy: text('publish_requested_by')
    .references(() => user.id, { onDelete: 'set null' }),
  publishReviewedAt: timestamp('publish_reviewed_at'),
  publishReviewedBy: text('publish_reviewed_by')
    .references(() => user.id, { onDelete: 'set null' }),
  publishReviewNotes: text('publish_review_notes'),
  creatorId: text('creator_id')
    .references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  visibilityIndex: index('agent_visibility_idx').on(table.visibility),
  publishStatusIndex: index('agent_publish_status_idx').on(table.publishStatus),
  inviteCodeUnique: uniqueIndex('agent_invite_code_unique').on(table.inviteCode),
}));

export const homeRow = pgTable('home_row', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: varchar('slug', { length: 128 }).notNull(),
  description: text('description'),
  isPublished: boolean('is_published').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  maxItems: integer('max_items'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIndex: index('home_row_slug_idx').on(table.slug),
  slugUnique: uniqueIndex('home_row_slug_unique').on(table.slug),
  sortIndex: index('home_row_sort_idx').on(table.sortOrder),
}));

export const homeRowAgent = pgTable('home_row_agent', {
  rowId: text('row_id')
    .notNull()
    .references(() => homeRow.id, { onDelete: 'cascade' }),
  agentTag: varchar('agent_tag', { length: 64 })
    .notNull()
    .references(() => agent.tag, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.rowId, table.agentTag] }),
  rowSortIndex: index('home_row_agent_sort_idx').on(table.rowId, table.sortOrder),
}));

// Better Auth Schema
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  // Admin plugin fields
  role: text('role').default('user'),
  banned: boolean('banned').default(false),
  banReason: text('banReason'),
  banExpires: timestamp('banExpires'),
});

export const creditAccount = pgTable('credit_account', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  balanceCents: integer('balance_cents').notNull().default(100),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  stripeCustomerId: text('stripe_customer_id'),
  defaultPaymentMethodId: text('default_payment_method_id'),
  autoReloadEnabled: boolean('auto_reload_enabled').notNull().default(false),
  autoReloadThresholdCents: integer('auto_reload_threshold_cents'),
  autoReloadAmountCents: integer('auto_reload_amount_cents'),
  lastAutoReloadAt: timestamp('last_auto_reload_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  stripeCustomerIdUnique: uniqueIndex('credit_account_stripe_customer_unique').on(table.stripeCustomerId),
}));

export const creditLedger = pgTable('credit_ledger', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  entryType: varchar('entry_type', { length: 32 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('posted'),
  reason: text('reason').notNull(),
  externalSource: varchar('external_source', { length: 64 }),
  externalId: text('external_id'),
  metadata: jsonb('metadata'),
  balanceAfterCents: integer('balance_after_cents'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIndex: index('credit_ledger_user_idx').on(table.userId),
  createdAtIndex: index('credit_ledger_created_at_idx').on(table.createdAt),
  externalUnique: uniqueIndex('credit_ledger_external_unique').on(table.externalSource, table.externalId),
}));

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expiresAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  // Admin plugin field
  impersonatedBy: text('impersonatedBy'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  idToken: text('idToken'),
  password: text('password'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// Relations
export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  createdAgents: many(agent),
  creditAccount: one(creditAccount, {
    fields: [user.id],
    references: [creditAccount.userId],
  }),
  creditLedger: many(creditLedger),
}));

export const creditAccountRelations = relations(creditAccount, ({ one }) => ({
  user: one(user, {
    fields: [creditAccount.userId],
    references: [user.id],
  }),
}));

export const creditLedgerRelations = relations(creditLedger, ({ one }) => ({
  user: one(user, {
    fields: [creditLedger.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const agentRelations = relations(agent, ({ one, many }) => ({
  creator: one(user, {
    fields: [agent.creatorId],
    references: [user.id],
  }),
  knowledge: many(agentKnowledge),
  homeRows: many(homeRowAgent),
}));

export const homeRowRelations = relations(homeRow, ({ many }) => ({
  agents: many(homeRowAgent),
}));

export const homeRowAgentRelations = relations(homeRowAgent, ({ one }) => ({
  row: one(homeRow, {
    fields: [homeRowAgent.rowId],
    references: [homeRow.id],
  }),
  agent: one(agent, {
    fields: [homeRowAgent.agentTag],
    references: [agent.tag],
  }),
}));

// Knowledgebase
export const knowledgebase = pgTable('knowledgebase', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  type: varchar('type', { length: 32 }).notNull().default('text'), // 'text', 'file', etc.
  metadata: jsonb('metadata'), // For flexible additional info (file size, format, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Junction table linking agents to knowledge items
export const agentKnowledge = pgTable('agent_knowledge', {
  agentTag: varchar('agent_tag', { length: 64 })
    .notNull()
    .references(() => agent.tag, { onDelete: 'cascade' }),
  knowledgeId: text('knowledge_id')
    .notNull()
    .references(() => knowledgebase.id, { onDelete: 'cascade' }),
  order: varchar('order', { length: 16 }).default('0'), // For ordering knowledge items
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
 
// Knowledgebase Relations
export const knowledgebaseRelations = relations(knowledgebase, ({ many }) => ({
  agentLinks: many(agentKnowledge),
}));

export const agentKnowledgeRelations = relations(agentKnowledge, ({ one }) => ({
  agent: one(agent, {
    fields: [agentKnowledge.agentTag],
    references: [agent.tag],
  }),
  knowledge: one(knowledgebase, {
    fields: [agentKnowledge.knowledgeId],
    references: [knowledgebase.id],
  }),
}));

// Conversations
export const conversation = pgTable('conversation', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  agentTag: varchar('agent_tag', { length: 64 })
    .notNull()
    .references(() => agent.tag, { onDelete: 'cascade' }),
  title: text('title'),
  modelId: varchar('model_id', { length: 128 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastMessageAt: timestamp('last_message_at'),
  archivedAt: timestamp('archived_at'),
  // Aggregated usage counters (best-effort)
  totalInputTokens: integer('total_input_tokens').notNull().default(0),
  totalOutputTokens: integer('total_output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  cachedInputTokens: integer('cached_input_tokens').notNull().default(0),
  reasoningTokens: integer('reasoning_tokens').notNull().default(0),
  lastUsage: jsonb('last_usage'),
});

// Messages (persist UIMessage parts as canonical)
export const message = pgTable('message', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversation.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull(), // 'user' | 'assistant' | 'system'
  uiParts: jsonb('ui_parts').notNull(), // Array<UIMessagePart>
  annotations: jsonb('annotations'), // Array<UIMessageAnnotation> (e.g., sources)
  textPreview: text('text_preview'),
  hasToolCalls: boolean('has_tool_calls').default(false),
  tokenUsage: jsonb('token_usage'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const conversationRelations = relations(conversation, ({ one, many }) => ({
  user: one(user, {
    fields: [conversation.userId],
    references: [user.id],
  }),
  agent: one(agent, {
    fields: [conversation.agentTag],
    references: [agent.tag],
  }),
  messages: many(message),
}));

export const messageRelations = relations(message, ({ one }) => ({
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
}));
