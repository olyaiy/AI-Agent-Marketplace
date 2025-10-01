'use client';

import Link from "next/link";
import useSWR from "swr";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export interface ConversationItem {
  id: string;
  agentId: string;
  dateIso: string;
}

const fetcher = async (url: string): Promise<ConversationItem[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
};

export function RecentConversationsClient() {
  const { data: conversations, error, isLoading } = useSWR<ConversationItem[]>(
    '/api/conversations',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  // Don't render section if no conversations and not loading
  if (!isLoading && !error && (!conversations || conversations.length === 0)) {
    return null;
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <SidebarMenuItem key={`skeleton-${i}`}>
                <div className="px-2 py-1.5 flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-20 ml-auto" />
                </div>
              </SidebarMenuItem>
            ))
          ) : error ? (
            // Error state
            <SidebarMenuItem>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Failed to load conversations
              </div>
            </SidebarMenuItem>
          ) : (
            // Actual conversations
            conversations?.map((row) => {
              const dateStr = new Date(row.dateIso).toLocaleDateString();
              const href = `/agent/${row.agentId}/${row.id}`;
              return (
                <SidebarMenuItem key={row.id}>
                  <SidebarMenuButton asChild>
                    <Link href={href}>
                      <span className="font-mono text-xs">{row.id.slice(0, 8)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{dateStr}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
