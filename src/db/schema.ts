import { pgTable, text, varchar } from 'drizzle-orm/pg-core';

export const agent = pgTable('agent', {
  tag: varchar('tag', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
});
