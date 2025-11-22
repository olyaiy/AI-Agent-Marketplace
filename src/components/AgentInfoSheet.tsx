'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MobileAgentHeader } from '@/components/MobileAgentHeader';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { dispatchAgentModelChange, dispatchAgentNewChat } from '@/lib/agent-events';
import { deriveProviderSlug, getDisplayName } from '@/lib/model-display';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderAvatar } from '@/components/ProviderAvatar';

interface AgentInfoSheetProps {
  name: string;
  avatarUrl?: string;
  tagline?: string | null;
  description?: string | null;
  agentTag?: string;
  visibility?: 'public' | 'invite_only' | 'private';
  inviteCode?: string | null;
  canEdit?: boolean;
  modelOptions?: string[];
  activeModel?: string;
}

function ModelLabel({ label, providerSlug }: { label: string; providerSlug: string | null }) {
  return (
    <div className="flex items-center gap-2 truncate">
      <ProviderAvatar providerSlug={providerSlug} />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function AgentInfoSheet({ name, avatarUrl, tagline, description, agentTag, visibility, inviteCode, canEdit, modelOptions, activeModel }: AgentInfoSheetProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const availableModels = useMemo(
    () => Array.isArray(modelOptions) ? Array.from(new Set(modelOptions.filter(Boolean))) : [],
    [modelOptions]
  );
  const [selectedModel, setSelectedModel] = useState<string | undefined>(() => activeModel || availableModels[0]);
  const [modelMeta, setModelMeta] = useState<Record<string, { label: string; providerSlug: string | null }>>({});
  
  const effectiveTagline = (tagline && tagline.trim().length > 0) ? tagline : 'Your creative thinking partner';
  const effectiveDescription = (description && description.trim().length > 0)
    ? description
    : `Hi there! I'm ${name}, your friendly AI companion. I love helping with creative projects, brainstorming ideas, and turning thoughts into reality.`;
  
  // Extract agent ID from tag (remove @ prefix)
  const agentId = agentTag ? agentTag.replace('@', '') : null;
  const visibilityLabel = useMemo(() => {
    if (!visibility || visibility === 'public') return null;
    return visibility === 'invite_only' ? 'Invite only' : 'Private';
  }, [visibility]);
  const inviteUrl = useMemo(() => {
    if (!inviteCode || visibility !== 'invite_only' || !agentTag) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/agent/${encodeURIComponent(agentId ?? '')}?invite=${inviteCode}`;
  }, [agentId, agentTag, inviteCode, visibility]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const replaceModelParam = useCallback((modelId: string | undefined) => {
    if (typeof window === 'undefined' || !modelId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('model') === modelId) return;
    url.searchParams.set('model', modelId);
    const nextSearch = url.searchParams.toString();
    const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, []);
  const applyModelSelection = useCallback((modelId: string, emitEvent = true) => {
    setSelectedModel(modelId);
    replaceModelParam(modelId);
    if (emitEvent) dispatchAgentModelChange(agentTag, modelId);
  }, [agentTag, replaceModelParam]);
  useEffect(() => {
    if (!selectedModel) {
      const first = activeModel || availableModels[0];
      if (first) applyModelSelection(first, false);
      return;
    }
    if (activeModel && activeModel !== selectedModel && availableModels.includes(activeModel)) {
      applyModelSelection(activeModel, false);
      return;
    }
    if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      const next = activeModel && availableModels.includes(activeModel) ? activeModel : availableModels[0];
      if (next) applyModelSelection(next, false);
    }
  }, [activeModel, applyModelSelection, availableModels, selectedModel]);

  useEffect(() => {
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

  const modelsWithMeta = useMemo(
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
  const selectedMeta = useMemo(
    () => modelsWithMeta.find((m) => m.id === selectedValue),
    [modelsWithMeta, selectedValue]
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <MobileAgentHeader
        name={name}
        avatarUrl={avatarUrl}
        tagline={tagline}
        onClick={() => setOpen(true)}
      />
      
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>About this agent</SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 overflow-y-auto h-full pb-20">
          {/* Agent Info Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            {agentId && (
              <div className="flex justify-end gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  aria-label="New chat"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
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
                      setOpen(false);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Chat
                  </Link>
                </Button>
                {canEdit ? (
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    aria-label="Edit agent"
                    className="shrink-0 border-gray-200 hover:border-gray-300"
                  >
                    <Link href={`/edit/${agentId}`}>
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            )}

            {/* Header with Avatar and Info */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {avatarUrl ? (
                <Image 
                  src={avatarUrl} 
                  alt="Agent Avatar" 
                  width={64} 
                  height={64}
                  className="rounded-lg flex-shrink-0"
                />
              ) : null}
              
              {/* Name and tagline */}
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
              </div>
            )}

            {canEdit && inviteUrl && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteUrl);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium text-left"
              >
                {copied ? 'Invite link copied' : 'Copy invite link'}
              </button>
            )}

            {availableModels.length > 0 && (
              <div className="space-y-2 border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500">Model</p>
                {availableModels.length === 1 ? (
                  <ModelLabel
                    label={selectedMeta?.label || getDisplayName(undefined, availableModels[0])}
                    providerSlug={selectedMeta?.providerSlug || deriveProviderSlug(null, availableModels[0])}
                  />
                ) : (
                  <Select
                    value={selectedValue}
                    onValueChange={(val) => applyModelSelection(val)}
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
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {effectiveDescription}
              </p>
            </div>

          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
