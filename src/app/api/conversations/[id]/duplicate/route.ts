import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation, message } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

/**
 * Generate a new title with (Copy N) suffix
 * - "Chat Name" → "Chat Name (Copy)"
 * - "Chat Name (Copy)" → "Chat Name (Copy 2)"
 * - "Chat Name (Copy 2)" → "Chat Name (Copy 3)"
 */
function generateCopyTitle(originalTitle: string | null): string {
    if (!originalTitle) {
        return 'Untitled Chat (Copy)';
    }

    // Check if title already ends with (Copy) or (Copy N)
    const copyPattern = /\(Copy(?:\s+(\d+))?\)$/;
    const match = originalTitle.match(copyPattern);

    if (match) {
        // Already has (Copy) or (Copy N) suffix
        const currentNum = match[1] ? parseInt(match[1], 10) : 1;
        const newNum = currentNum + 1;
        return originalTitle.replace(copyPattern, `(Copy ${newNum})`);
    }

    // No suffix yet, add (Copy)
    return `${originalTitle} (Copy)`;
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    if (!session?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
        });
    }

    const { id: originalId } = await params;

    // Fetch original conversation with ownership check
    const [original] = await db
        .select()
        .from(conversation)
        .where(sql`${conversation.id} = ${originalId} AND ${conversation.userId} = ${session.user.id}`)
        .limit(1);

    if (!original) {
        return new Response(JSON.stringify({ error: 'Conversation not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' },
        });
    }

    const newId = randomUUID();
    const newTitle = generateCopyTitle(original.title);
    const now = new Date();

    try {
        // Use transaction for atomicity
        await db.transaction(async (tx) => {
            // 1. Create new conversation record
            await tx.insert(conversation).values({
                id: newId,
                userId: session.user.id,
                agentTag: original.agentTag,
                title: newTitle,
                modelId: original.modelId,
                activeRunId: null, // No active run for duplicated chat
                createdAt: now,
                updatedAt: now,
                lastMessageAt: original.lastMessageAt,
                archivedAt: null, // Fresh copy is not archived
                // Copy usage counters
                totalInputTokens: original.totalInputTokens,
                totalOutputTokens: original.totalOutputTokens,
                totalTokens: original.totalTokens,
                cachedInputTokens: original.cachedInputTokens,
                reasoningTokens: original.reasoningTokens,
                lastUsage: original.lastUsage,
            });

            // 2. Fetch all messages from original conversation
            const originalMessages = await tx
                .select()
                .from(message)
                .where(eq(message.conversationId, originalId))
                .orderBy(message.createdAt);

            // 3. Map messages with new IDs and new conversation ID
            if (originalMessages.length > 0) {
                const newMessages = originalMessages.map((msg) => ({
                    id: randomUUID(),
                    conversationId: newId,
                    role: msg.role,
                    uiParts: msg.uiParts,
                    annotations: msg.annotations,
                    textPreview: msg.textPreview,
                    hasToolCalls: msg.hasToolCalls,
                    tokenUsage: msg.tokenUsage,
                    modelId: msg.modelId,
                    generationId: msg.generationId,
                    gatewayCostUsd: msg.gatewayCostUsd,
                    createdAt: msg.createdAt, // Preserve original timestamps for message ordering
                }));

                // 4. Bulk insert all messages
                await tx.insert(message).values(newMessages);
            }
        });

        // Build redirect URL
        const agentId = original.agentTag.startsWith('@')
            ? original.agentTag.slice(1)
            : original.agentTag;

        return new Response(
            JSON.stringify({
                id: newId,
                agentTag: original.agentTag,
                agentId,
                title: newTitle,
                redirectUrl: `/agent/${agentId}/${newId}`,
            }),
            {
                status: 201,
                headers: { 'content-type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('Failed to duplicate conversation:', error);
        return new Response(JSON.stringify({ error: 'Failed to duplicate conversation' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}
