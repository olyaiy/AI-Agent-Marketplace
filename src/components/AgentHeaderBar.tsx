'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, ChevronDown } from 'lucide-react';
import { AgentInfoDialog } from '@/components/AgentInfoDialog';
import { dispatchAgentModelChange, dispatchAgentNewChat } from '@/lib/agent-events';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deriveProviderSlug, getDisplayName } from '@/lib/model-display';
import { ProviderAvatar } from '@/components/ProviderAvatar';

const ModelLabel = React.memo(function ModelLabel({ label, providerSlug }: { label: string; providerSlug: string | null }) {
    return (
        <div className="flex items-center gap-2 truncate">
            <ProviderAvatar providerSlug={providerSlug} size={18} />
            <span className="truncate text-sm">{label}</span>
        </div>
    );
});
ModelLabel.displayName = 'ModelLabel';

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
    const [isMac, setIsMac] = React.useState(false);
    const agentId = agentTag ? agentTag.replace('@', '') : null;

    React.useEffect(() => {
        if (typeof navigator !== 'undefined') {
            setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
        }
    }, []);

    // Model selection state
    const availableModels = React.useMemo(
        () => Array.isArray(modelOptions) ? Array.from(new Set(modelOptions.filter(Boolean))) : [],
        [modelOptions]
    );
    const [selectedModel, setSelectedModel] = React.useState<string | undefined>(() => activeModel || availableModels[0]);
    const [modelMeta, setModelMeta] = React.useState<Record<string, { label: string; providerSlug: string | null }>>({});

    const replaceModelParam = React.useCallback((modelId: string | undefined) => {
        if (typeof window === 'undefined' || !modelId) return;
        const url = new URL(window.location.href);
        if (url.searchParams.get('model') === modelId) return;
        url.searchParams.set('model', modelId);
        const nextSearch = url.searchParams.toString();
        const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
        window.history.replaceState(null, '', nextUrl);
    }, []);

    const applyModelSelection = React.useCallback((modelId: string, emitEvent = true) => {
        setSelectedModel(modelId);
        replaceModelParam(modelId);
        if (emitEvent) dispatchAgentModelChange(agentTag, modelId, null);
    }, [agentTag, replaceModelParam]);

    React.useEffect(() => {
        if (!selectedModel) {
            const first = activeModel || availableModels[0];
            if (first) applyModelSelection(first, false);
            return;
        }
        if (selectedModel && availableModels.length > 0 && !availableModels.includes(selectedModel)) {
            const next = availableModels[0];
            if (next) applyModelSelection(next);
        }
    }, [activeModel, applyModelSelection, availableModels, selectedModel]);

    React.useEffect(() => {
        const missing = availableModels.filter((id) => !modelMeta[id]);
        if (missing.length === 0) return;
        const controller = new AbortController();
        (async () => {
            try {
                const url = new URL('/api/gateway/models', window.location.origin);
                url.searchParams.set('ttlMs', '60000');
                const res = await fetch(url.toString(), { signal: controller.signal });
                if (!res.ok) throw new Error('failed');
                const json = await res.json();
                const items: Array<{ id: string; name: string }> = json?.data ?? [];
                const nextUpdates: Record<string, { label: string; providerSlug: string | null }> = {};
                missing.forEach((id) => {
                    const hit = items.find((m) => m.id === id);
                    const modelName = hit?.name;
                    nextUpdates[id] = {
                        label: getDisplayName(modelName, id),
                        providerSlug: deriveProviderSlug(modelName, id),
                    };
                });
                setModelMeta((prev) => ({ ...prev, ...nextUpdates }));
            } catch {
                setModelMeta((prev) => {
                    const next = { ...prev };
                    missing.forEach((id) => {
                        next[id] = {
                            label: getDisplayName(undefined, id),
                            providerSlug: deriveProviderSlug(undefined, id),
                        };
                    });
                    return next;
                });
            }
        })();
        return () => controller.abort();
    }, [availableModels, modelMeta]);

    const modelsWithMeta = React.useMemo(
        () => availableModels.map((id) => {
            const meta = modelMeta[id];
            return {
                id,
                label: meta?.label || getDisplayName(undefined, id),
                providerSlug: meta?.providerSlug || deriveProviderSlug(meta?.label, id),
            };
        }),
        [availableModels, modelMeta]
    );

    const selectedValue = selectedModel ?? availableModels[0] ?? '';
    const selectedMeta = React.useMemo(
        () => modelsWithMeta.find((m) => m.id === selectedValue),
        [modelsWithMeta, selectedValue]
    );

    return (
        <>
            {/* 
        Header bar - Sticky at top, with padding left to accommodate the absolute SidebarTrigger 
        The layout SidebarTrigger is absolute positioned at left-2 (8px). 
        We add pl-12 (48px) to clear it comfortably.
      */}
            <div
                className={cn(
                    "sticky top-0 z-40 w-full h-12 flex items-center bg-background/20 backdrop-blur-xl pl-12 pr-4 transition-all relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-border/50",
                    className
                )}
            >
                {/* Vertical divider to separate from sidebar toggle */}
                <div className="h-8 w-px bg-border/50 mr-2" />

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

                {/* Model Selector - Right side of header */}
                {availableModels.length > 1 && (
                    <Select
                        value={selectedValue}
                        onValueChange={(val) => applyModelSelection(val)}
                    >
                        <SelectTrigger className="h-8 w-auto min-w-[140px] max-w-[200px] px-2.5 rounded-lg bg-background/50 border border-border/50 hover:bg-muted/60 transition-colors text-xs mr-2">
                            <SelectValue asChild>
                                <ModelLabel
                                    label={selectedMeta?.label || getDisplayName(undefined, selectedValue)}
                                    providerSlug={selectedMeta?.providerSlug || deriveProviderSlug(null, selectedValue)}
                                />
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {modelsWithMeta.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                    <ModelLabel label={m.label} providerSlug={m.providerSlug} />
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Single model display (no dropdown needed) */}
                {availableModels.length === 1 && (
                    <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-muted/40 border border-border/30 mr-2">
                        <ModelLabel
                            label={selectedMeta?.label || getDisplayName(undefined, selectedValue)}
                            providerSlug={selectedMeta?.providerSlug || deriveProviderSlug(null, selectedValue)}
                        />
                    </div>
                )}

                {/* New Chat Button - dispatches event for instant reset */}
                {agentId && (
                    <Link
                        href={`/agent/${agentId}`}
                        prefetch={false}
                        onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                            event.preventDefault();
                            dispatchAgentNewChat(agentTag);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-[0.98] transition-all flex-shrink-0 shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New</span>
                        <kbd className="hidden sm:inline-flex items-center ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-foreground/20 text-primary-foreground/80">
                            {isMac ? '⌘' : 'Ctrl'}K
                        </kbd>
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
                visibility={visibility}
                inviteCode={inviteCode}
                publishStatus={publishStatus}
                publishReviewNotes={publishReviewNotes}
            />
        </>
    );
}
