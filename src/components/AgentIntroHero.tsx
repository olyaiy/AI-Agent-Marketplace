'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderAvatar } from '@/components/ProviderAvatar';
import { deriveProviderSlug, getDisplayName } from '@/lib/model-display';

interface AgentIntroHeroProps {
    name: string;
    avatarUrl?: string;
    tagline?: string | null;
    description?: string | null;
    agentTag?: string;
    canEdit?: boolean;
    visibility?: 'public' | 'invite_only' | 'private';
    publishStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
    publishReviewNotes?: string | null;
    className?: string;
    // Model picker props
    modelOptions?: string[];
    currentModel?: string;
    onModelChange?: (modelId: string) => void;
}

/**
 * AgentIntroHero - A clean, elegant hero component for the new chat page.
 * Desktop: Horizontal layout with large avatar, info, and model picker inline.
 * Mobile: Stacked centered layout.
 */
export function AgentIntroHero({
    name,
    avatarUrl,
    tagline,
    description,
    agentTag,
    canEdit,
    visibility,
    publishStatus,
    publishReviewNotes,
    className,
    modelOptions = [],
    currentModel,
    onModelChange,
}: AgentIntroHeroProps) {
    const effectiveTagline = tagline?.trim() || 'Your creative thinking partner';
    const effectiveDescription = description?.trim() ||
        `Hi there! I'm ${name}, your friendly AI companion. I love helping with creative projects, brainstorming ideas, and turning thoughts into reality.`;

    const agentId = agentTag?.replace('@', '') ?? null;

    const visibilityLabel = React.useMemo(() => {
        if (!visibility || visibility === 'public') return null;
        return visibility === 'invite_only' ? 'Invite only' : 'Private';
    }, [visibility]);

    const approvalLabel = React.useMemo(() => {
        if (!publishStatus || publishStatus === 'approved') return null;
        if (publishStatus === 'pending_review') {
            return { text: 'Pending', tone: 'text-amber-600 dark:text-amber-400' };
        }
        if (publishStatus === 'rejected') {
            return { text: 'Rejected', tone: 'text-red-600 dark:text-red-400' };
        }
        return { text: 'Draft', tone: 'text-muted-foreground' };
    }, [publishStatus]);

    // Model selector helpers
    const availableModels = React.useMemo(
        () => Array.from(new Set(modelOptions.filter((m) => typeof m === 'string' && m.trim().length > 0))),
        [modelOptions]
    );
    const selectedModel = React.useMemo(() => {
        if (currentModel && availableModels.includes(currentModel)) return currentModel;
        return availableModels[0] ?? '';
    }, [availableModels, currentModel]);
    const modelsWithMeta = React.useMemo(
        () =>
            availableModels.map((id) => ({
                id,
                label: getDisplayName(undefined, id),
                providerSlug: deriveProviderSlug(undefined, id),
            })),
        [availableModels]
    );
    const selectedMeta = React.useMemo(
        () => modelsWithMeta.find((m) => m.id === selectedModel),
        [modelsWithMeta, selectedModel]
    );

    const showModelPicker = availableModels.length > 0 && onModelChange;

    return (
        <div className={cn('w-full max-w-2xl mx-auto animate-in fade-in duration-500 relative', className)}>
            {/* Edit button - top right (desktop) */}
            {canEdit && agentId && (
                <Link
                    href={`/edit/${agentId}`}
                    className="absolute top-2 right-0 p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all hidden md:flex items-center gap-1 text-xs"
                    aria-label="Edit agent"
                >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                </Link>
            )}

            {/* Mobile Layout - Stacked centered */}
            <div className="md:hidden flex flex-col items-center text-center px-4 pt-4 pb-0">
                {/* Edit button - top right (mobile) */}
                {canEdit && agentId && (
                    <Link
                        href={`/edit/${agentId}`}
                        className="absolute top-2 right-2 p-1.5 text-muted-foreground/50 hover:text-foreground transition-colors"
                        aria-label="Edit agent"
                    >
                        <Pencil className="w-4 h-4" />
                    </Link>
                )}

                {/* Avatar - Full size */}
                <div className="mb-3">
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt={`${name} avatar`}
                            width={100}
                            height={100}
                            className="rounded-2xl object-contain"
                            priority
                        />
                    ) : (
                        <div className="w-[100px] h-[100px] rounded-2xl bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                            <span className="text-3xl font-bold text-muted-foreground/70">
                                {name.charAt(0)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Name */}
                <h1 className="text-xl font-semibold text-foreground mb-1">{name}</h1>

                {/* Tagline */}
                <p className="text-sm text-muted-foreground mb-2">{effectiveTagline}</p>

                {/* Description - Full */}
                <p className="text-sm text-muted-foreground/70 mb-3 max-w-sm leading-relaxed">
                    {effectiveDescription}
                </p>

                {/* Model Picker - Mobile (smaller) */}
                {showModelPicker && (
                    <div className="w-full max-w-[240px] mb-2">
                        {availableModels.length === 1 ? (
                            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                                <ProviderAvatar providerSlug={selectedMeta?.providerSlug || null} size={14} />
                                <span>{selectedMeta?.label || selectedModel}</span>
                            </div>
                        ) : (
                            <Select value={selectedModel} onValueChange={onModelChange}>
                                <SelectTrigger className="h-7 w-full text-xs bg-transparent border-muted-foreground/20">
                                    <SelectValue asChild>
                                        <div className="flex items-center gap-1.5">
                                            <ProviderAvatar providerSlug={selectedMeta?.providerSlug || null} size={14} />
                                            <span className="truncate">{selectedMeta?.label || selectedModel}</span>
                                        </div>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {modelsWithMeta.map((m) => (
                                        <SelectItem key={m.id} value={m.id} className="text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <ProviderAvatar providerSlug={m.providerSlug} size={14} />
                                                <span className="truncate">{m.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                )}

                {/* Status badges - subtle */}
                {(visibilityLabel || approvalLabel) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {visibilityLabel && <span>{visibilityLabel}</span>}
                        {visibilityLabel && approvalLabel && <span>·</span>}
                        {approvalLabel && <span className={approvalLabel.tone}>{approvalLabel.text}</span>}
                    </div>
                )}

                {/* Rejection notes */}
                {publishStatus === 'rejected' && publishReviewNotes && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400 max-w-xs">
                        {publishReviewNotes}
                    </p>
                )}
            </div>

            {/* Desktop Layout - Clean horizontal */}
            <div className="hidden md:block px-4 pt-6 pb-0">
                <div className="flex items-start gap-6">
                    {/* Left: Full Avatar */}
                    <div className="flex-shrink-0">
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt={`${name} avatar`}
                                width={120}
                                height={120}
                                className="w-[120px] h-auto rounded-2xl object-contain"
                                priority
                            />
                        ) : (
                            <div className="w-[120px] h-[120px] rounded-2xl bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                                <span className="text-4xl font-bold text-muted-foreground/70">
                                    {name.charAt(0)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 min-w-0">
                        {/* Name row */}
                        <h1 className="text-2xl font-semibold text-foreground mb-1">
                            {name}
                        </h1>

                        {/* Tagline */}
                        <p className="text-base text-muted-foreground mb-2">
                            {effectiveTagline}
                        </p>

                        {/* Description - Full */}
                        <p className="text-sm text-muted-foreground/70 mb-3 leading-relaxed">
                            {effectiveDescription}
                        </p>

                        {/* Bottom row: status + model picker */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Status badges - subtle inline */}
                            {(visibilityLabel || approvalLabel) && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {visibilityLabel && <span className="px-2 py-0.5 rounded-full bg-muted">{visibilityLabel}</span>}
                                    {approvalLabel && <span className={cn('px-2 py-0.5 rounded-full bg-muted', approvalLabel.tone)}>{approvalLabel.text}</span>}
                                </div>
                            )}

                            {/* Model Picker - Desktop (smaller) */}
                            {showModelPicker && (
                                <div className="flex items-center">
                                    {availableModels.length === 1 ? (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <ProviderAvatar providerSlug={selectedMeta?.providerSlug || null} size={14} />
                                            <span>{selectedMeta?.label || selectedModel}</span>
                                        </div>
                                    ) : (
                                        <Select value={selectedModel} onValueChange={onModelChange}>
                                            <SelectTrigger className="h-7 min-w-[140px] max-w-[180px] text-xs bg-transparent border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors">
                                                <SelectValue asChild>
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <ProviderAvatar providerSlug={selectedMeta?.providerSlug || null} size={14} />
                                                        <span className="truncate">{selectedMeta?.label || selectedModel}</span>
                                                    </div>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent align="start">
                                                {modelsWithMeta.map((m) => (
                                                    <SelectItem key={m.id} value={m.id} className="text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <ProviderAvatar providerSlug={m.providerSlug} size={14} />
                                                            <span className="truncate">{m.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Rejection notes */}
                        {publishStatus === 'rejected' && publishReviewNotes && (
                            <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                                <span className="font-medium">Note:</span> {publishReviewNotes}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AgentIntroHero;
