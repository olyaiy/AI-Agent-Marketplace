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
            <div className="md:hidden flex flex-col items-center text-center px-4 pt-6 pb-0 ">
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
                <div className="mb-4">
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt={`${name} avatar`}
                            width={110}
                            height={110}
                            className="rounded-2xl object-contain"
                            priority
                        />
                    ) : (
                        <div className="w-[110px] h-[110px] rounded-2xl bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                            <span className="text-4xl font-bold text-muted-foreground/70">
                                {name.charAt(0)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Name - larger for readability */}
                <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">{name}</h1>

                {/* Tagline - larger and clearer */}
                <p className="text-base text-muted-foreground mb-3 leading-relaxed">{effectiveTagline}</p>

                {/* Description - improved readability */}
                <p className="text-[15px] text-muted-foreground/80 mb-4 max-w-md leading-relaxed">
                    {effectiveDescription}
                </p>

                {/* Model Picker - Mobile */}
                {showModelPicker && (
                    <div className="w-full max-w-[240px] mb-3">
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



                {/* Rejection notes */}
                {publishStatus === 'rejected' && publishReviewNotes && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400 max-w-xs">
                        {publishReviewNotes}
                    </p>
                )}
            </div>

            {/* Desktop Layout - Clean horizontal */}
            <div className="hidden md:block px-4 pt-8 pb-0  ">
                <div className="flex items-start gap-8 ">
                    {/* Left: Full Avatar */}
                    <div className="flex-shrink-0  mb-0 p-2 hover:scale-101 transition-transform duration-200 cursor-pointer z-[1] ">
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt={`${name} avatar`}
                                width={130}
                                height={130}
                                className="w-[150px] h-auto rounded-2xl object-contain -mb-4"
                                priority
                            />
                        ) : (
                            <div className="w-[130px] h-[130px] rounded-2xl bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                                <span className="text-5xl font-bold text-muted-foreground/70">
                                    {name.charAt(0)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 min-w-0 pt-1 pb-4">
                        {/* Name - larger and bolder */}
                        <h1 className="text-3xl font-semibold text-foreground  tracking-tight">
                            {name}
                        </h1>

                        {/* Tagline - more prominent */}
                        <p className="text-lg text-muted-foreground mb-3 leading-relaxed">
                            {effectiveTagline}
                        </p>

                        {/* Description - better readability with larger text and line height */}
                        <p className="text-[15px] text-muted-foreground/80 mb-5 leading-[1.7]">
                            {effectiveDescription}
                        </p>

                        {/* Bottom row: status + model picker */}
                        <div className="flex items-center gap-3 flex-wrap">


                            {/* Model Picker - Desktop */}
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
