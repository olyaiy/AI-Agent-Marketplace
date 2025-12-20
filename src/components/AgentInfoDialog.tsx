'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Copy, Check, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dispatchAgentNewChat } from '@/lib/agent-events';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AgentInfoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    name: string;
    avatarUrl?: string;
    tagline?: string | null;
    description?: string | null;
    agentTag?: string;
    canEdit?: boolean;
    visibility?: 'public' | 'invite_only' | 'private';
    inviteCode?: string | null;
    publishStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
    publishReviewNotes?: string | null;
}

export function AgentInfoDialog({
    open,
    onOpenChange,
    name,
    avatarUrl,
    tagline,
    description,
    agentTag,
    canEdit,
    visibility,
    inviteCode,
    publishStatus,
    publishReviewNotes,
}: AgentInfoDialogProps) {
    const effectiveTagline = (tagline && tagline.trim().length > 0) ? tagline : 'Your creative thinking partner';
    const effectiveDescription = (description && description.trim().length > 0)
        ? description
        : `Hi there! I'm ${name}, your friendly AI companion. I love helping with creative projects, brainstorming ideas, and turning thoughts into reality.`;

    const visibilityLabel = React.useMemo(() => {
        if (!visibility || visibility === 'public') return null;
        return visibility === 'invite_only' ? 'Invite only' : 'Private';
    }, [visibility]);

    const approvalLabel = React.useMemo(() => {
        if (!publishStatus || publishStatus === 'approved') return null;
        if (publishStatus === 'pending_review') {
            return { text: 'Pending approval', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' };
        }
        if (publishStatus === 'rejected') {
            return { text: 'Rejected', tone: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' };
        }
        return { text: 'Draft', tone: 'bg-muted text-muted-foreground' };
    }, [publishStatus]);

    const agentId = agentTag ? agentTag.replace('@', '') : null;

    const inviteUrl = React.useMemo(() => {
        if (!inviteCode || visibility !== 'invite_only' || !agentTag) return '';
        if (typeof window === 'undefined') return '';
        return `${window.location.origin}/agent/${encodeURIComponent(agentId ?? '')}?invite=${inviteCode}`;
    }, [agentId, agentTag, inviteCode, visibility]);

    const [copiedInvite, setCopiedInvite] = React.useState(false);
    const [isMac, setIsMac] = React.useState(false);

    React.useEffect(() => {
        if (!copiedInvite) return;
        const t = setTimeout(() => setCopiedInvite(false), 2000);
        return () => clearTimeout(t);
    }, [copiedInvite]);

    React.useEffect(() => {
        if (typeof navigator !== 'undefined') {
            setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
        }
    }, []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden border shadow-lg bg-background">
                <DialogHeader className="sr-only">
                    <DialogTitle>About {name}</DialogTitle>
                </DialogHeader>

                {/* Header (Top) - Avatar, Name, Layout */}
                <div className="p-6 pb-2">
                    <div className="flex flex-col items-center text-center space-y-4">
                        {/* Avatar */}
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt={name}
                                width={80}
                                height={80}
                                className="rounded-2xl bg-muted object-cover shadow-sm ring-1 ring-border/50"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-3xl font-semibold text-muted-foreground shadow-sm ring-1 ring-border/50">
                                {name.charAt(0)}
                            </div>
                        )}

                        {/* Name & Title */}
                        <div className="space-y-1 w-full">
                            <h2 className="text-xl font-bold tracking-tight text-foreground">{name}</h2>
                            <p className="text-sm text-muted-foreground">{effectiveTagline}</p>

                            {/* Badges Row */}
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5">
                                {agentTag && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground/80">
                                        {agentTag}
                                    </span>
                                )}
                                {visibilityLabel && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                        {visibilityLabel}
                                    </span>
                                )}
                                {approvalLabel && (
                                    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", approvalLabel.tone)}>
                                        {approvalLabel.text}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section (Middle) */}
                <div className="px-6 py-4 space-y-5">

                    {/* Primary Button - Big Call to Action */}
                    {agentId && (
                        <Link
                            href={`/agent/${agentId}`}
                            prefetch={false}
                            onClick={(event) => {
                                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                                event.preventDefault();
                                dispatchAgentNewChat(agentTag);
                                onOpenChange(false);
                            }}
                            className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4 ml-1" strokeWidth={2.5} />
                            <span>Start New Chat</span>
                            <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-1.5 bg-primary-foreground/20 px-1.5 py-0.5 rounded text-[10px] font-medium text-primary-foreground">
                                {isMac ? '⌘' : 'Ctrl'}K
                            </kbd>
                        </Link>
                    )}

                    {/* About */}
                    <div className="space-y-1.5">
                        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-0.5">About</h3>
                        <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-xl">
                            {effectiveDescription}
                        </p>
                    </div>
                </div>

                {/* Footer Section (Bottom) - Secondary Actions */}
                <div className="p-4 bg-muted/30 border-t flex items-center justify-between gap-3">
                    {/* Copy Link */}
                    {canEdit && inviteUrl ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(inviteUrl);
                                    setCopiedInvite(true);
                                } catch {
                                    setCopiedInvite(false);
                                }
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground h-9 gap-2"
                        >
                            {copiedInvite ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedInvite ? 'Copied' : 'Copy invite'}
                        </Button>
                    ) : <div />}

                    {/* Edit Button - Bottom Right */}
                    {canEdit && agentId && (
                        <Link href={`/edit/${agentId}`}>
                            <Button variant="ghost" size="sm" className="text-xs font-medium h-9 gap-2 text-muted-foreground hover:text-foreground">
                                <Settings className="w-3.5 h-3.5" />
                                Edit Agent
                            </Button>
                        </Link>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

