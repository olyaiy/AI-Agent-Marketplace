'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
import {
  updateConversationTitleOptimistically,
  removeConversationOptimistically,
  revalidateConversations,
} from "@/lib/conversations-cache";

export interface ConversationItem {
  id: string;
  agentId: string;
  dateIso: string;
  title?: string | null;
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
            conversations?.map((conversation) => (
              <ConversationMenuItem key={conversation.id} conversation={conversation} />
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ConversationMenuItem({ conversation }: { conversation: ConversationItem }) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title || '');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const dateStr = new Date(conversation.dateIso).toLocaleDateString();
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
      // Optimistically update the UI
      await updateConversationTitleOptimistically(conversation.id, trimmedTitle);
      setRenameDialogOpen(false);

      // Send to server
      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!res.ok) {
        // Rollback on error
        await revalidateConversations();
      } else {
        // Revalidate to ensure sync
        await revalidateConversations();
      }
    } catch (error) {
      // Rollback on error
      await revalidateConversations();
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      // Optimistically remove from UI
      await removeConversationOptimistically(conversation.id);
      setDeleteDialogOpen(false);

      // Send delete request
      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Rollback on error
        await revalidateConversations();
      } else {
        // Revalidate to ensure sync
        await revalidateConversations();
        
        // If user is viewing this conversation, redirect to home
        if (isCurrentConversation) {
          router.push('/');
        }
      }
    } catch (error) {
      // Rollback on error
      await revalidateConversations();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <SidebarMenuItem className="group/item">
        <div className="flex items-center w-full gap-1">
          <SidebarMenuButton asChild className="flex-1">
            <Link href={href}>
              <span className="text-xs truncate flex-1">{displayText}</span>
              <span className="ml-2 text-xs text-muted-foreground shrink-0">{dateStr}</span>
            </Link>
          </SidebarMenuButton>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover/item:opacity-100 h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
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
      </SidebarMenuItem>

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
