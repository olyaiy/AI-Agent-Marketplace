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
import { useSidebar } from '@/components/ui/sidebar';

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
  publishStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  publishReviewNotes?: string | null;
}

function ModelLabel({ label, providerSlug }: { label: string; providerSlug: string | null }) {
  return (
    <div className="flex items-center gap-2 truncate">
      <ProviderAvatar providerSlug={providerSlug} />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function AgentInfoSheet({ name, avatarUrl, tagline, description, agentTag, visibility, inviteCode, canEdit, modelOptions, activeModel, publishStatus, publishReviewNotes }: AgentInfoSheetProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toggleSidebar } = useSidebar();

  // Hide the global sidebar trigger on mobile when this component is mounted
  useEffect(() => {
    document.body.classList.add('hide-mobile-sidebar-trigger');
    return () => {
      document.body.classList.remove('hide-mobile-sidebar-trigger');
    };
  }, []);
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
  const approvalLabel = useMemo(() => {
    if (!publishStatus || publishStatus === 'approved') return null;
    if (publishStatus === 'pending_review') return { text: 'Pending approval', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (publishStatus === 'rejected') return { text: 'Public request rejected', tone: 'bg-red-50 text-red-700 border-red-200' };
    return { text: 'Not public', tone: 'bg-slate-50 text-slate-700 border-slate-200' };
  }, [publishStatus]);
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
        onAgentClick={() => setOpen(true)}
        onMenuClick={toggleSidebar}
      />

      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl px-0 pb-0">
        {/* Visually hidden title for accessibility */}
        <SheetHeader className="sr-only">
          <SheetTitle>About {name}</SheetTitle>
        </SheetHeader>

        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Compact Header - Horizontal Layout */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            {/* Smaller Avatar with subtle glow */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-2xl blur-sm" />
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Agent Avatar"
                  width={64}
                  height={64}
                  className="relative rounded-2xl shadow-sm ring-1 ring-white"
                />
              ) : (
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm ring-1 ring-white flex items-center justify-center">
                  <span className="text-xl font-semibold text-gray-400">{name.charAt(0)}</span>
                </div>
              )}
            </div>

            {/* Name, Tagline & Badges - compact */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 truncate">{name}</h2>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{effectiveTagline}</p>
                </div>

                {/* Inline Action buttons */}
                {agentId && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      aria-label="New chat"
                      className="h-8 px-2.5 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
                        <Plus className="w-4 h-4" />
                      </Link>
                    </Button>
                    {canEdit && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        aria-label="Edit agent"
                        className="h-8 px-2.5 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        <Link href={`/edit/${agentId}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Badges row - inline below name */}
              {(agentTag || visibilityLabel || approvalLabel) && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {agentTag && (
                    <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-md">{agentTag}</span>
                  )}
                  {visibilityLabel && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide text-[9px] font-medium">
                      {visibilityLabel}
                    </span>
                  )}
                  {approvalLabel && (
                    <span className={`px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-wide font-medium ${approvalLabel.tone}`}>
                      {approvalLabel.text}
                    </span>
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
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      {copied ? '✓ Copied' : 'Copy invite'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-4 pb-8 max-h-[calc(85vh-120px)]">
          {/* Divider */}
          <div className="border-t border-gray-100 mb-4" />

          {/* Description Section - First, more prominent */}
          <div className="mb-4">
            <p className="text-[13px] text-gray-600 leading-relaxed">
              {effectiveDescription}
            </p>
            {publishStatus === 'rejected' && publishReviewNotes && (
              <div className="flex items-start gap-2 mt-3 p-2.5 bg-red-50 rounded-lg border border-red-100">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-red-700">{publishReviewNotes}</p>
              </div>
            )}
          </div>

          {/* Model Selection - Compact inline style */}
          {availableModels.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-500">Model</span>
                </div>

                {availableModels.length === 1 ? (
                  <div className="flex-1 min-w-0">
                    <ModelLabel
                      label={selectedMeta?.label || getDisplayName(undefined, availableModels[0])}
                      providerSlug={selectedMeta?.providerSlug || deriveProviderSlug(null, availableModels[0])}
                    />
                  </div>
                ) : (
                  <Select
                    value={selectedValue}
                    onValueChange={(val) => applyModelSelection(val)}
                  >
                    <SelectTrigger className="h-9 flex-1 min-w-0 rounded-lg border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm">
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
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
