'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Pencil } from 'lucide-react';
import { dispatchAgentModelChange, dispatchAgentNewChat } from '@/lib/agent-events';
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
      return { text: 'Pending approval', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (publishStatus === 'rejected') {
      return { text: 'Public request rejected', tone: 'bg-red-50 text-red-700 border-red-200' };
    }
    return { text: 'Not public', tone: 'bg-slate-50 text-slate-700 border-slate-200' };
  }, [publishStatus]);
  
  // Extract agent ID from tag (remove @ prefix)
  const agentId = agentTag ? agentTag.replace('@', '') : null;
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
    if (emitEvent) dispatchAgentModelChange(agentTag, modelId);
  }, [agentTag, replaceModelParam]);
  React.useEffect(() => {
    if (!selectedModel) {
      const first = activeModel || availableModels[0];
      if (first) applyModelSelection(first, false);
      return;
    }
    // keep selection if still available, otherwise fall back
    if (selectedModel && availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      const next = availableModels[0];
      if (next) applyModelSelection(next);
    }
  }, [activeModel, applyModelSelection, availableModels, selectedModel]);

  // Fetch model metadata (name + provider) for available models to render nicer labels/icons
  React.useEffect(() => {
    const missing = availableModels.filter((id) => !modelMeta[id]);
    if (missing.length === 0) return;
    const controller = new AbortController();
    (async () => {
      try {
        const url = new URL('/api/openrouter/models', window.location.origin);
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
      "w-full bg-white rounded-lg border border-gray-200 p-4 space-y-4",
      variant === 'sidebar' ? 'h-full flex flex-col' : '',
      'relative'
    )}>
      <div className="flex justify-end gap-2">
        {agentId && (
          <Button
            asChild
            variant="outline"
            size="sm"
            aria-label={`New chat (${isMac ? '⌘' : 'Ctrl+'}K)`}
          >
            <Link
              href={`/agent/${agentId}`}
              prefetch={false}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
                  return;
                }
                event.preventDefault();
                dispatchAgentNewChat(agentTag);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Chat
              <kbd className="ml-1.5 pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
                <span className="text-xs">{isMac ? '⌘' : 'Ctrl+'}</span>K
              </kbd>
            </Link>
          </Button>
        )}
        {canEdit && agentId ? (
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label="Edit agent"
          >
            <Link href={`/edit/${agentId}`}>
              <Pencil className="w-4 h-4" />
            </Link>
          </Button>
        ) : null}
      </div>
      {/* Header with Avatar and Info */}
      <div className="flex items-center gap-3">
        {/* Avatar on left */}
        {avatarUrl ? (
          <Image 
            src={avatarUrl} 
            alt="Agent Avatar" 
            width={64} 
            height={64}
            className="rounded-lg flex-shrink-0"
          />
        ) : null}
        
        {/* Name and tagline on right */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{name}</h2>
          <p className="text-sm text-gray-600 line-clamp-2 leading-tight mt-1">{effectiveTagline}</p>
        </div>
      </div>

      {/* Tag */}
      {agentTag && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 font-mono">
          <span>{agentTag}</span>
          {visibilityLabel && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase tracking-wide text-[10px]">
              {visibilityLabel}
            </span>
          )}
          {approvalLabel ? (
            <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wide ${approvalLabel.tone}`}>
              {approvalLabel.text}
            </span>
          ) : null}
        </div>
      )}

      {canEdit && inviteUrl && (
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
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {copiedInvite ? 'Invite link copied' : 'Copy invite link'}
        </button>
      )}

      {availableModels.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Model</p>
          {availableModels.length === 1 ? (
            <ModelLabel
              label={selectedMeta?.label || getDisplayName(undefined, availableModels[0])}
              providerSlug={selectedMeta?.providerSlug || deriveProviderSlug(null, availableModels[0])}
            />
          ) : (
            <Select
              value={selectedValue}
              onValueChange={(val) => {
                setSelectedModel(val);
                dispatchAgentModelChange(agentTag, val);
              }}
            >
              <SelectTrigger className="h-9">
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
        </div>
      )}

      {/* Description */}
      <div className={cn(
        "border-t border-gray-200 pt-4",
        variant === 'sidebar' ? 'flex-1 overflow-y-auto' : ''
      )}>
        {publishStatus === 'rejected' && publishReviewNotes ? (
          <p className="text-xs text-red-700 mb-2">Public request rejected: {publishReviewNotes}</p>
        ) : null}
        <p className="text-sm text-gray-600 leading-relaxed">
          {effectiveDescription}
        </p>
      </div>

    </div>
  );
}
