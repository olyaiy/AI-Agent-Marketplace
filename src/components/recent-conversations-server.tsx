import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { conversation } from "@/db/schema";
import { sql } from "drizzle-orm";

export interface RecentSidebarItem {
  id: string;
  agentId: string;
  dateIso: string;
}

export async function fetchRecentConversations(): Promise<RecentSidebarItem[]> {
  noStore();
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  if (!session?.user) return [];

  const rows = await db
    .select({
      id: conversation.id,
      agentTag: conversation.agentTag,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
    })
    .from(conversation)
    .where(sql`${conversation.userId} = ${session.user.id}`)
    .orderBy(sql`COALESCE(${conversation.lastMessageAt}, ${conversation.updatedAt}, ${conversation.createdAt}) DESC`)
    .limit(5);

  return rows.map((r) => {
    const date = (r.lastMessageAt as unknown as string) || (r.updatedAt as unknown as string) || (r.createdAt as unknown as string);
    const agentId = r.agentTag?.startsWith("@") ? r.agentTag.slice(1) : (r.agentTag as unknown as string);
    return { id: r.id, agentId, dateIso: new Date(date).toISOString() };
  });
}

