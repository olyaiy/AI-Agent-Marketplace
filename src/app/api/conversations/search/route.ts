import { auth } from '@/lib/auth';
import { db } from '@/db/drizzle';
import { conversation, message, agent } from '@/db/schema';
import { sql, and, or, eq, desc, gte, lte, ilike, inArray } from 'drizzle-orm';

export interface ConversationSearchResult {
  id: string;
  title: string | null;
  agentTag: string;
  agentName: string;
  messageCount: number;
  preview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  matchType: 'title' | 'content' | 'none';
  relevanceScore: number;
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get('q')?.trim() || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const agentFilter = url.searchParams.get('agentTag') || undefined;
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;
  const offset = (page - 1) * limit;

  try {
    // Build WHERE conditions
    const conditions = [eq(conversation.userId, session.user.id)];
    
    if (agentFilter) {
      conditions.push(eq(conversation.agentTag, agentFilter));
    }
    
    if (startDate) {
      conditions.push(gte(conversation.createdAt, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(conversation.createdAt, new Date(endDate)));
    }

    // If there's a search query, we need to search both title and message content
    if (query) {
      // Search in titles and get conversations with matching messages
      const searchPattern = `%${query}%`;
      
      // Get conversation IDs that match in title OR have matching messages
      const matchingConvos = await db
        .selectDistinct({
          conversationId: conversation.id,
          title: conversation.title,
          agentTag: conversation.agentTag,
          agentName: agent.name,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          lastMessageAt: conversation.lastMessageAt,
          // Calculate relevance score
          titleMatch: sql<number>`
            CASE 
              WHEN LOWER(${conversation.title}) = LOWER(${query}) THEN 100
              WHEN LOWER(${conversation.title}) LIKE LOWER(${query} || '%') THEN 80
              WHEN LOWER(${conversation.title}) LIKE LOWER('%' || ${query} || '%') THEN 60
              ELSE 0
            END
          `.as('title_match'),
        })
        .from(conversation)
        .innerJoin(agent, eq(conversation.agentTag, agent.tag))
        .leftJoin(message, eq(message.conversationId, conversation.id))
        .where(
          and(
            ...conditions,
            or(
              ilike(conversation.title, searchPattern),
              ilike(message.textPreview, searchPattern)
            )
          )
        )
        .orderBy(
          desc(sql`title_match`),
          desc(conversation.lastMessageAt),
          desc(conversation.updatedAt)
        )
        .limit(limit)
        .offset(offset);

      // Get message counts and previews for each conversation
      const conversationIds = matchingConvos.map(c => c.conversationId);
      
      if (conversationIds.length === 0) {
        return new Response(JSON.stringify({
          conversations: [],
          totalCount: 0,
          hasMore: false,
          page,
          limit,
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      // Get message counts
      const messageCounts = await db
        .select({
          conversationId: message.conversationId,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(message)
        .where(inArray(message.conversationId, conversationIds))
        .groupBy(message.conversationId);

      // Get first user message preview for each conversation
      const previews = await db
        .select({
          conversationId: message.conversationId,
          preview: message.textPreview,
        })
        .from(message)
        .where(
          and(
            inArray(message.conversationId, conversationIds),
            eq(message.role, 'user')
          )
        )
        .orderBy(message.createdAt);

      // Build results
      const messageCountMap = new Map(messageCounts.map(m => [m.conversationId, m.count]));
      const previewMap = new Map<string, string>();
      previews.forEach(p => {
        if (!previewMap.has(p.conversationId) && p.preview) {
          previewMap.set(p.conversationId, p.preview);
        }
      });

      const results: ConversationSearchResult[] = matchingConvos.map(conv => {
        const titleScore = conv.titleMatch || 0;
        const preview = previewMap.get(conv.conversationId);
        const hasContentMatch = preview?.toLowerCase().includes(query.toLowerCase());
        
        return {
          id: conv.conversationId,
          title: conv.title,
          agentTag: conv.agentTag,
          agentName: conv.agentName,
          messageCount: messageCountMap.get(conv.conversationId) || 0,
          preview: preview || null,
          lastMessageAt: (conv.lastMessageAt || conv.updatedAt || conv.createdAt).toISOString(),
          createdAt: conv.createdAt.toISOString(),
          matchType: titleScore > 0 ? 'title' : (hasContentMatch ? 'content' : 'none'),
          relevanceScore: titleScore + (hasContentMatch ? 40 : 0),
        };
      });

      // Get total count for pagination
      const totalResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${conversation.id})::int` })
        .from(conversation)
        .leftJoin(message, eq(message.conversationId, conversation.id))
        .where(
          and(
            ...conditions,
            or(
              ilike(conversation.title, searchPattern),
              ilike(message.textPreview, searchPattern)
            )
          )
        );

      const totalCount = totalResult[0]?.count || 0;

      return new Response(JSON.stringify({
        conversations: results,
        totalCount,
        hasMore: offset + limit < totalCount,
        page,
        limit,
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } else {
      // No search query - just return recent conversations
      const conversations = await db
        .select({
          id: conversation.id,
          title: conversation.title,
          agentTag: conversation.agentTag,
          agentName: agent.name,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          lastMessageAt: conversation.lastMessageAt,
        })
        .from(conversation)
        .innerJoin(agent, eq(conversation.agentTag, agent.tag))
        .where(and(...conditions))
        .orderBy(
          desc(conversation.lastMessageAt),
          desc(conversation.updatedAt),
          desc(conversation.createdAt)
        )
        .limit(limit)
        .offset(offset);

      const conversationIds = conversations.map(c => c.id);

      if (conversationIds.length === 0) {
        return new Response(JSON.stringify({
          conversations: [],
          totalCount: 0,
          hasMore: false,
          page,
          limit,
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      // Get message counts
      const messageCounts = await db
        .select({
          conversationId: message.conversationId,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(message)
        .where(inArray(message.conversationId, conversationIds))
        .groupBy(message.conversationId);

      // Get first user message preview
      const previews = await db
        .select({
          conversationId: message.conversationId,
          preview: message.textPreview,
        })
        .from(message)
        .where(
          and(
            inArray(message.conversationId, conversationIds),
            eq(message.role, 'user')
          )
        )
        .orderBy(message.createdAt);

      const messageCountMap = new Map(messageCounts.map(m => [m.conversationId, m.count]));
      const previewMap = new Map<string, string>();
      previews.forEach(p => {
        if (!previewMap.has(p.conversationId) && p.preview) {
          previewMap.set(p.conversationId, p.preview);
        }
      });

      const results: ConversationSearchResult[] = conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        agentTag: conv.agentTag,
        agentName: conv.agentName,
        messageCount: messageCountMap.get(conv.id) || 0,
        preview: previewMap.get(conv.id) || null,
        lastMessageAt: (conv.lastMessageAt || conv.updatedAt || conv.createdAt).toISOString(),
        createdAt: conv.createdAt.toISOString(),
        matchType: 'none',
        relevanceScore: 0,
      }));

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(conversation)
        .where(and(...conditions));

      const totalCount = totalResult[0]?.count || 0;

      return new Response(JSON.stringify({
        conversations: results,
        totalCount,
        hasMore: offset + limit < totalCount,
        page,
        limit,
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

