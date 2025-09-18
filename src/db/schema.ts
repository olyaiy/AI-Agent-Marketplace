import { pgTable, text } from 'drizzle-orm/pg-core';

export const agent = pgTable('agent', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull(),
});
