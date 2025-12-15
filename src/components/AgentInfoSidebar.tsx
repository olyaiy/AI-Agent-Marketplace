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
      return { text: 'Pending approval', tone: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/50' };
    }
    if (publishStatus === 'rejected') {
      return { text: 'Rejected', tone: 'bg-red-50 text-red-700 ring-1 ring-red-200/50' };
    }
    return { text: 'Not public', tone: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200/50' };
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
      "w-full transition-all duration-500",
      variant === 'sidebar' ? 'h-full flex flex-col' : '',
    )}>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-1 pr-2 space-y-8">

        {/* Identity Section */}
        <div className="space-y-4 pt-2">
          {/* Avatar with gradient glow */}
          <div className="relative inline-block group">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-2xl blur opacity-75 group-hover:opacity-100 transition-opacity" />
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Agent Avatar"
                width={72}
                height={72}
                className="relative rounded-2xl shadow-sm bg-white ring-2 ring-white"
              />
            ) : (
              <div className="relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 ring-2 ring-white flex items-center justify-center text-xl font-bold text-gray-400 select-none">
                {name.charAt(0)}
              </div>
            )}

            {/* Status Indicator */}
            {publishStatus === 'approved' && (
              <div className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 ring-2 ring-white"></span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">{name}</h2>
            <p className="text-sm text-gray-500 leading-snug">{effectiveTagline}</p>
          </div>

          {/* Badges / Meta */}
          {agentTag && (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-500 text-xs font-medium font-mono">
                {agentTag}
              </span>
              {visibilityLabel && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                  {visibilityLabel}
                </span>
              )}
              {approvalLabel && (
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${approvalLabel.tone}`}>
                  {approvalLabel.text}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Primary Actions */}
        <div className="flex gap-2">
          {agentId && (
            <Link
              href={`/agent/${agentId}`}
              prefetch={false}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                dispatchAgentNewChat(agentTag);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </Link>
          )}
          {canEdit && agentId && (
            <Link
              href={`/edit/${agentId}`}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 active:scale-[0.98] transition-all"
              aria-label="Edit agent"
            >
              <Pencil className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Description & Model */}
        <div className="space-y-6">
          {publishStatus === 'rejected' && publishReviewNotes && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-sm text-red-800">
              <span className="font-semibold block mb-0.5">Note:</span> {publishReviewNotes}
            </div>
          )}

          <div className="prose prose-sm prose-gray text-gray-600 leading-relaxed">
            {effectiveDescription}
          </div>

          {availableModels.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Model</label>
              {availableModels.length === 1 ? (
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100/50">
                  <ModelLabel
                    label={selectedMeta?.label || getDisplayName(undefined, availableModels[0])}
                    providerSlug={selectedMeta?.providerSlug || deriveProviderSlug(null, availableModels[0])}
                  />
                </div>
              ) : (
                <Select
                  value={selectedValue}
                  onValueChange={(val) => {
                    setSelectedModel(val);
                    dispatchAgentModelChange(agentTag, val);
                  }}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl bg-white border-gray-200 hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-900/10">
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
                className="w-full py-2 text-xs font-medium text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                {copiedInvite ? 'Link copied to clipboard' : 'Copy invite link'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Shortcuts? Optional */}
    </div>
  );
}
