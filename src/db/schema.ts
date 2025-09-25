import { pgTable, text, varchar } from 'drizzle-orm/pg-core';

export const agent = pgTable('agent', {
  tag: varchar('tag', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  model: varchar('model', { length: 128 }).notNull().default('openai/gpt-5-mini'),
  avatar: varchar('avatar', { length: 256 }),
  tagline: text('tagline'),
  description: text('description'),
});
