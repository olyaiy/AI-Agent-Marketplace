"use server";

import { db } from '@/db/drizzle';
import { conversation } from '@/db/schema';
import { randomUUID } from 'node:crypto';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export interface CreateConversationInput {
  agentTag: string;
  model?: string;
}

export async function createConversation(input: CreateConversationInput) {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  
  if (!session?.user) {
    return { ok: false, error: 'Unauthorized', id: null };
  }

  const { agentTag, model } = input;

  if (!agentTag || typeof agentTag !== 'string') {
    return { ok: false, error: 'agentTag is required', id: null };
  }

  const id = randomUUID();

  try {
    await db.insert(conversation).values({
      id,
      userId: session.user.id,
      agentTag,
      modelId: (model && String(model)) || 'openai/gpt-5-nano',
    });

    // Revalidate the entire layout to update the sidebar
    revalidatePath('/', 'layout');

    return { ok: true, error: null, id };
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return { ok: false, error: 'Failed to create conversation', id: null };
  }
}
