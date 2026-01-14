'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Plus, Pencil } from 'lucide-react';
import { dispatchAgentModelChange, dispatchAgentNewChat } from '@/lib/agent-events';
import { getAgentModelPreference } from '@/lib/agent-model-preferences';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deriveProviderSlug, getDisplayName } from '@/lib/model-display';
import { ProviderAvatar } from '@/components/ProviderAvatar';

const ModelLabel = React.memo(function ModelLabel({ label, providerSlug }: { label: string; providerSlug: string | null }) {
  return (
    <div className="flex items-center gap-2 truncate">
      <ProviderAvatar providerSlug={providerSlug} size={24} />
      <span className="truncate">{label}</span>
    </div>
  );
});
ModelLabel.displayName = 'ModelLabel';

interface AgentInfoSidebarProps {
  name: string;
  avatarUrl?: string;
  tagline?: string | null;
  description?: string | null;
  variant?: 'sidebar' | 'sheet';
  agentTag?: string;
  canEdit?: boolean;
  modelOptions?: string[];
  activeModel?: string;
  visibility?: 'public' | 'invite_only' | 'private';
  inviteCode?: string | null;
  publishStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  publishReviewNotes?: string | null;
}

export default function AgentInfoSidebar({ name, avatarUrl, tagline, description, variant = 'sidebar', agentTag, canEdit, modelOptions, activeModel, visibility, inviteCode, publishStatus, publishReviewNotes }: AgentInfoSidebarProps) {
  const effectiveTagline = (tagline && tagline.trim().length > 0) ? tagline : 'Your creative thinking partner';
  const effectiveDescription = (description && description.trim().length > 0)
    ? description
    : `Hi there! I'm ${name}, your friendly AI companion. I love helping with creative projects, brainstorming ideas, and turning thoughts into reality.`;
  const visibilityLabel = React.useMemo(() => {
    if (!visibility || visibility === 'public') return null;
    return visibility === 'invite_only' ? 'Invite only' : 'Private';
  }, [visibility]);
  const inviteUrl = React.useMemo(() => {
    if (!inviteCode || visibility !== 'invite_only' || !agentTag) return '';
    if (typeof window === 'undefined') return '';
    const agentId = agentTag.replace('@', '');
    return `${window.location.origin}/agent/${encodeURIComponent(agentId)}?invite=${inviteCode}`;
  }, [agentTag, inviteCode, visibility]);
  const [copiedInvite, setCopiedInvite] = React.useState(false);
  const [isMac, setIsMac] = React.useState(false);
  const searchParams = useSearchParams();
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
  const approvalLabel = React.useMemo(() => {
    if (!publishStatus || publishStatus === 'approved') return null;
    if (publishStatus === 'pending_review') {
      return { text: 'Pending approval', tone: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
    }
    if (publishStatus === 'rejected') {
      return { text: 'Rejected', tone: 'bg-red-50 text-red-700 ring-1 ring-red-200' };
    }
    return { text: 'Not public', tone: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200' };
  }, [publishStatus]);

  // Extract agent ID from tag (remove @ prefix)
  const agentId = agentTag ? agentTag.replace('@', '') : null;
  const availableModels = React.useMemo(
    () => Array.isArray(modelOptions) ? Array.from(new Set(modelOptions.filter(Boolean))) : [],
    [modelOptions]
  );
  const [selectedModel, setSelectedModel] = React.useState<string | undefined>(() => activeModel || availableModels[0]);
  const preferredModel = React.useMemo(() => {
    const paramModel = searchParams?.get('model')?.trim();
    if (paramModel && availableModels.includes(paramModel)) return paramModel;
    const storedModel = getAgentModelPreference(agentTag);
    if (storedModel && availableModels.includes(storedModel)) return storedModel;
    return activeModel;
  }, [activeModel, agentTag, availableModels, searchParams]);
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
    if (emitEvent) dispatchAgentModelChange(agentTag, modelId);
  }, [agentTag, replaceModelParam]);
  React.useEffect(() => {
    if (!selectedModel) {
      const first = preferredModel || availableModels[0];
      if (first) applyModelSelection(first, false);
      return;
    }
    if (preferredModel && preferredModel !== selectedModel && availableModels.includes(preferredModel)) {
      applyModelSelection(preferredModel, false);
      return;
    }
    // keep selection if still available, otherwise fall back
    if (selectedModel && availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      const next = preferredModel && availableModels.includes(preferredModel) ? preferredModel : availableModels[0];
      if (next) applyModelSelection(next);
    }
  }, [applyModelSelection, availableModels, preferredModel, selectedModel]);

  // Fetch model metadata (name + provider) for available models to render nicer labels/icons
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
          const name = hit?.name;
          nextUpdates[id] = {
            label: getDisplayName(name, id),
            providerSlug: deriveProviderSlug(name, id),
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
    <div className={cn(
      "w-full bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm transition-all duration-500",
      variant === 'sidebar' ? 'h-full flex flex-col' : '',
    )}>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8 no-scrollbar">

        {/* Identity Section */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            {/* Avatar with subtle ring */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-gray-100 to-white rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Agent Avatar"
                  width={64}
                  height={64}
                  className="relative rounded-2xl bg-muted object-cover ring-1 ring-border/50"
                />
              ) : (
                <div className="relative w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground select-none ring-1 ring-border/50">
                  {name.charAt(0)}
                </div>
              )}
              {/* Status Indicator */}
              {publishStatus === 'approved' && (
                <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 ring-2 ring-white"></span>
                </div>
              )}
            </div>

            {/* Edit Button (Top Right) */}
            {canEdit && agentId && (
              <Link
                href={`/edit/${agentId}`}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all"
                aria-label="Edit agent"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <h2 className="text-xl font-bold text-card-foreground tracking-tight leading-none mb-2">{name}</h2>
              <p className="text-sm font-medium text-muted-foreground leading-snug">{effectiveTagline}</p>
            </div>
            {/* Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {agentTag && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-mono border border-border">
                  {agentTag}
                </span>
              )}
              {visibilityLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-medium border border-amber-100 dark:border-amber-900/50">
                  {visibilityLabel}
                </span>
              )}
              {approvalLabel && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${approvalLabel.tone}`}>
                  {approvalLabel.text}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Action - Full Width */}
        {agentId && (
          <Link
            href={`/agent/${agentId}`}
            prefetch={false}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              dispatchAgentNewChat(agentTag);
            }}
            className="group flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>Start New Chat</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 ml-2 text-[10px] font-sans text-primary-foreground/50">
              <span>{isMac ? '⌘' : 'Ctrl'}</span>K
            </kbd>
          </Link>
        )}

        {/* Divider */}
        <hr className="border-border" />

        {/* About Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-card-foreground uppercase tracking-widest pl-1">About</h3>

          {publishStatus === 'rejected' && publishReviewNotes && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50 text-xs text-red-800 dark:text-red-400 leading-relaxed">
              <span className="font-bold">Note:</span> {publishReviewNotes}
            </div>
          )}

          <div className="text-sm text-muted-foreground leading-relaxed pl-1">
            {effectiveDescription}
          </div>
        </div>

        {/* Model Section */}
        {availableModels.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold text-card-foreground uppercase tracking-widest pl-1 mb-1">Model</h3>
            <Select
              value={selectedValue}
              onValueChange={(val) => {
                setSelectedModel(val);
                dispatchAgentModelChange(agentTag, val);
              }}
            >
              <SelectTrigger className="w-full h-auto py-2 px-3 rounded-xl bg-muted border-transparent hover:bg-muted/80 transition-all focus:ring-1 focus:ring-primary/10">
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
          </div>
        )}

        {/* Invite Link */}
        {canEdit && inviteUrl && (
          <div className="pt-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteUrl);
                  setCopiedInvite(true);
                } catch {
                  setCopiedInvite(false);
                }
              }}
              className="w-full py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              <span>{copiedInvite ? 'Copied to clipboard' : 'Copy invite link'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
