"use client";

import Link from "next/link";
import { useRecentLocalItems } from "@/lib/recent-local";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

interface Props {
  serverIds?: string[];
}

export function RecentChatsClientItems({ serverIds }: Props) {
  const items = useRecentLocalItems();
  if (!items || items.length === 0) return null;
  const serverSet = new Set(serverIds || []);
  
  // Deduplicate by key as a final safety measure against race conditions
  const seenKeys = new Set<string>();
  const uniqueItems = items.filter((row) => {
    const key = row.key || `${row.status}:${row.agentId}:${row.conversationId ?? ''}:${row.dateIso}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
  
  return (
    <>
      {uniqueItems
        .filter((row) => !row.conversationId || !serverSet.has(row.conversationId))
        .map((row) => {
          const href = row.conversationId ? `/agent/${row.agentId}/${row.conversationId}` : undefined;
          const key = row.key || `${row.status}:${row.agentId}:${row.conversationId ?? ''}:${row.dateIso}`;
          return (
            <SidebarMenuItem key={key}>
              {href ? (
                <SidebarMenuButton asChild>
                  <Link href={href}>
                    <span className="font-mono text-xs">{row.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{new Date(row.dateIso).toLocaleDateString()}</span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton disabled>
                  <span className="font-mono text-xs opacity-70">{row.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(row.dateIso).toLocaleDateString()}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
    </>
  );
}
