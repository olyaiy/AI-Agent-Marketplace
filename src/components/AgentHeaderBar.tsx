'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown } from 'lucide-react';
import { AgentInfoDialog } from '@/components/AgentInfoDialog';
import { cn } from '@/lib/utils';

interface AgentHeaderBarProps {
    name: string;
    avatarUrl?: string;
    tagline?: string | null;
    description?: string | null;
    agentTag?: string;
    canEdit?: boolean;
    modelOptions?: string[];
    activeModel?: string;
    visibility?: 'public' | 'invite_only' | 'private';
    inviteCode?: string | null;
    publishStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
    publishReviewNotes?: string | null;
    className?: string;
}

export function AgentHeaderBar({
    name,
    avatarUrl,
    tagline,
    description,
    agentTag,
    canEdit,
    modelOptions,
    activeModel,
    visibility,
    inviteCode,
    publishStatus,
    publishReviewNotes,
    className,
}: AgentHeaderBarProps) {
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const router = useRouter();
    const agentId = agentTag ? agentTag.replace('@', '') : null;

    return (
        <>
            {/* 
        Header bar - Sticky at top, with padding left to accommodate the absolute SidebarTrigger 
        The layout SidebarTrigger is absolute positioned at left-2 (8px). 
        We add pl-12 (48px) to clear it comfortably.
      */}
            <div
                className={cn(
                    "sticky top-0 z-40 w-full h-12 flex items-center bg-background/80 backdrop-blur-sm border-b border-border/50 pl-12 pr-4 transition-all  ",
                    className
                )}
            >
                {/* Agent Info - Clickable to open dialog */}
                <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/60 active:bg-muted transition-colors group min-w-0 cursor-pointer"
                >
                    {/* Avatar */}
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt={name}
                            width={30}
                            height={30}
                            className="rounded-md flex-shrink-0  "
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-md bg-muted flex-shrink-0 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {name.charAt(0)}
                        </div>
                    )}

                    {/* Name */}
                    <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">{name}</span>

                    {/* Chevron indicator */}
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* New Chat Button - client-side navigation to agent page */}
                {agentId && (
                    <Link
                        href={`/agent/${agentId}`}
                        onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                            event.preventDefault();
                            router.push(`/agent/${agentId}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-[0.98] transition-all flex-shrink-0 shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New</span>
                    </Link>
                )}
            </div>

            {/* Agent Info Dialog */}
            <AgentInfoDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                name={name}
                avatarUrl={avatarUrl}
                tagline={tagline}
                description={description}
                agentTag={agentTag}
                canEdit={canEdit}
                modelOptions={modelOptions}
                activeModel={activeModel}
                visibility={visibility}
                inviteCode={inviteCode}
                publishStatus={publishStatus}
                publishReviewNotes={publishReviewNotes}
            />
        </>
    );
}
