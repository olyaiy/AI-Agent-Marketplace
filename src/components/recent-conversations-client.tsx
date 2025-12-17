'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { MoreVertical, Pencil, Trash2, ArrowRight, ChevronDown } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  updateConversationTitleOptimistically,
  removeConversationOptimistically,
  revalidateConversations,
} from "@/lib/conversations-cache";
import { cn } from "@/lib/utils";

export interface ConversationItem {
  id: string;
  agentId: string;
  agentTag: string;
  dateIso: string;
  title?: string | null;
  agentName: string;
  agentAvatar: string | null;
}

interface AgentGroup {
  agentId: string;
  agentTag: string;
  agentName: string;
  agentAvatar: string | null;
  conversations: ConversationItem[];
  lastActivityDate: string;
}

const fetcher = async (url: string): Promise<ConversationItem[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('Failed to fetch conversations') as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
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

  // Group conversations by agent, limit to 3 agents with 3 chats each
  const agentGroups = useMemo<AgentGroup[]>(() => {
    if (!conversations || conversations.length === 0) return [];

    const groupMap = new Map<string, AgentGroup>();

    for (const conv of conversations) {
      const existing = groupMap.get(conv.agentId);
      if (existing) {
        // Only add up to 3 conversations per agent
        if (existing.conversations.length < 3) {
          existing.conversations.push(conv);
        }
      } else {
        groupMap.set(conv.agentId, {
          agentId: conv.agentId,
          agentTag: conv.agentTag,
          agentName: conv.agentName,
          agentAvatar: conv.agentAvatar,
          conversations: [conv],
          lastActivityDate: conv.dateIso,
        });
      }
    }

    // Return top 3 agents (already ordered by most recent activity from API)
    return Array.from(groupMap.values()).slice(0, 3);
  }, [conversations]);

  // Don't render section if empty
  if (!isLoading && !error && agentGroups.length === 0) {
    return null;
  }

  // Don't render if there's any error
  if (error) {
    return null;
  }

  const hasMoreConversations = (conversations?.length || 0) > 9;

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
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="pl-6 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </SidebarMenuItem>
            ))
          ) : (
            <>
              {/* Display agent groups */}
              {agentGroups.map((group) => (
                <AgentGroupSection key={group.agentId} group={group} />
              ))}

              {/* View all button */}
              {hasMoreConversations && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/conversations" className="text-muted-foreground hover:text-foreground">
                      <ArrowRight className="h-4 w-4" />
                      <span>View all chats</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function AgentGroupSection({ group }: { group: AgentGroup }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="w-full justify-between pr-2">
            <Link
              href={`/agent/${group.agentId}`}
              className="flex items-center gap-2 flex-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar className="h-5 w-5 shrink-0">
                {group.agentAvatar ? (
                  <AvatarImage src={group.agentAvatar} alt={group.agentName} />
                ) : null}
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {group.agentName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">{group.agentName}</span>
            </Link>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.conversations.map((conversation) => (
              <ConversationSubItem key={conversation.id} conversation={conversation} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function ConversationSubItem({ conversation }: { conversation: ConversationItem }) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title || '');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const href = `/agent/${conversation.agentId}/${conversation.id}`;
  const displayText = conversation.title || `Chat ${conversation.id.slice(0, 8)}`;
  const isCurrentConversation = pathname?.includes(conversation.id);

  async function handleRename() {
    if (!newTitle.trim() || newTitle.trim() === conversation.title) {
      setRenameDialogOpen(false);
      return;
    }

    setIsRenaming(true);
    const trimmedTitle = newTitle.trim();

    try {
      await updateConversationTitleOptimistically(conversation.id, trimmedTitle);
      setRenameDialogOpen(false);

      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!res.ok) {
        await revalidateConversations();
      } else {
        await revalidateConversations();
      }
    } catch {
      await revalidateConversations();
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      await removeConversationOptimistically(conversation.id);
      setDeleteDialogOpen(false);

      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        await revalidateConversations();
      } else {
        await revalidateConversations();

        if (isCurrentConversation) {
          router.push('/');
        }
      }
    } catch {
      await revalidateConversations();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <SidebarMenuSubItem className="group/item">
        <div className="flex items-center w-full gap-1">
          <SidebarMenuSubButton asChild className="flex-1">
            <Link href={href}>
              <span className="text-xs truncate">{displayText}</span>
            </Link>
          </SidebarMenuSubButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover/item:opacity-100 h-6 w-6 flex items-center justify-center rounded-md hover:bg-accent transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
                <span className="sr-only">More options</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setNewTitle(conversation.title || '');
                  setRenameDialogOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuSubItem>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>
              Enter a new name for this conversation.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Conversation title"
            maxLength={60}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} disabled={isRenaming}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !newTitle.trim()}>
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{displayText}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
