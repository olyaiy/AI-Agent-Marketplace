import { pgTable, text, varchar, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const agent = pgTable('agent', {
  tag: varchar('tag', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  model: varchar('model', { length: 128 }).notNull().default('openai/gpt-5-mini'),
  avatar: varchar('avatar', { length: 256 }),
  tagline: text('tagline'),
  description: text('description'),
});

// Better Auth Schema
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

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
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
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

// Conversations
export const conversation = pgTable('conversation', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  agentTag: varchar('agent_tag', { length: 64 })
    .notNull()
    .references(() => agent.tag, { onDelete: 'restrict' }),
  title: text('title'),
  systemPrompt: text('system_prompt_snapshot'),
  modelId: varchar('model_id', { length: 128 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastMessageAt: timestamp('last_message_at'),
  archivedAt: timestamp('archived_at'),
});

// Messages (persist UIMessage parts as canonical)
export const message = pgTable('message', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversation.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull(), // 'user' | 'assistant' | 'system'
  uiParts: jsonb('ui_parts').notNull(), // Array<UIMessagePart>
  textPreview: text('text_preview'),
  hasToolCalls: boolean('has_tool_calls').default(false),
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
