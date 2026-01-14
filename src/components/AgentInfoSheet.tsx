'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MobileAgentHeader } from '@/components/MobileAgentHeader';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { dispatchAgentModelChange, dispatchAgentNewChat } from '@/lib/agent-events';
import { getAgentModelPreference } from '@/lib/agent-model-preferences';
import { deriveProviderSlug, getDisplayName } from '@/lib/model-display';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderAvatar } from '@/components/ProviderAvatar';
import { useSidebar } from '@/components/ui/sidebar';
import { useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();

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
  const preferredModel = useMemo(() => {
    const paramModel = searchParams?.get('model')?.trim();
    if (paramModel && availableModels.includes(paramModel)) return paramModel;
    const storedModel = getAgentModelPreference(agentTag);
    if (storedModel && availableModels.includes(storedModel)) return storedModel;
    return activeModel;
  }, [activeModel, agentTag, availableModels, searchParams]);
  const [modelMeta, setModelMeta] = useState<Record<string, { label: string; providerSlug: string | null; providers?: string[]; defaultProvider?: string | null }>>({});
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

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
    setSelectedProvider(null);
    replaceModelParam(modelId);
    if (emitEvent) dispatchAgentModelChange(agentTag, modelId, null);
  }, [agentTag, replaceModelParam]);
  useEffect(() => {
    if (!selectedModel) {
      const first = preferredModel || availableModels[0];
      if (first) applyModelSelection(first, false);
      return;
    }
    if (preferredModel && preferredModel !== selectedModel && availableModels.includes(preferredModel)) {
      applyModelSelection(preferredModel, false);
      return;
    }
    if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      const next = preferredModel && availableModels.includes(preferredModel) ? preferredModel : availableModels[0];
      if (next) applyModelSelection(next, false);
    }
  }, [applyModelSelection, availableModels, preferredModel, selectedModel]);

  useEffect(() => {
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
        const items: Array<{ id: string; name: string; providers?: string[]; default_provider?: string | null }> = json?.data ?? [];
        const nextUpdates: Record<string, { label: string; providerSlug: string | null; providers?: string[]; defaultProvider?: string | null }> = {};
        missing.forEach((id) => {
          const hit = items.find((m) => m.id === id);
          const name = hit?.name;
          nextUpdates[id] = {
            label: getDisplayName(name, id),
            providerSlug: deriveProviderSlug(name, id),
            providers: hit?.providers,
            defaultProvider: hit?.default_provider ?? deriveProviderSlug(name, id),
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
              providers: [],
              defaultProvider: deriveProviderSlug(undefined, id),
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
        providers: meta?.providers || [],
        defaultProvider: meta?.defaultProvider || meta?.providerSlug || deriveProviderSlug(meta?.label, id),
      };
    }),
    [availableModels, modelMeta]
  );
  const selectedValue = selectedModel ?? availableModels[0] ?? '';
  const selectedMeta = useMemo(
    () => modelsWithMeta.find((m) => m.id === selectedValue),
    [modelsWithMeta, selectedValue]
  );
  const providerOptionsForSelected = useMemo(() => {
    const set = new Set<string>();
    if (selectedMeta?.providers) selectedMeta.providers.forEach((p) => set.add((p || '').toLowerCase()));
    if (selectedMeta?.providerSlug) set.add((selectedMeta.providerSlug || '').toLowerCase());
    return Array.from(set).filter(Boolean);
  }, [selectedMeta]);

  useEffect(() => {
    // reset provider override when model changes
    setSelectedProvider(null);
  }, [selectedValue]);

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
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
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
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/80 shadow-sm ring-1 ring-border/20 flex items-center justify-center">
                  <span className="text-xl font-semibold text-muted-foreground">{name.charAt(0)}</span>
                </div>
              )}
            </div>

            {/* Name, Tagline & Badges - compact */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground truncate">{name}</h2>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{effectiveTagline}</p>
                </div>

                {/* Action buttons - better visual hierarchy */}
                {agentId && (
                  <div className="flex gap-2 flex-shrink-0">
                    {/* New Chat - Primary action with filled style */}
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
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New</span>
                    </Link>

                    {/* Edit - Secondary subtle action */}
                    {canEdit && (
                      <Link
                        href={`/edit/${agentId}`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98] transition-all"
                        aria-label="Edit agent"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Badges row - inline below name */}
              {(agentTag || visibilityLabel || approvalLabel) && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {agentTag && (
                    <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-md border border-border">{agentTag}</span>
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
                      className="text-[10px] text-sidebar-primary hover:text-sidebar-primary/80 font-medium transition-colors"
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
          <div className="border-t border-border mb-4" />

          {/* Description Section - First, more prominent */}
          <div className="mb-4">
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {effectiveDescription}
            </p>
            {publishStatus === 'rejected' && publishReviewNotes && (
              <div className="flex items-start gap-2 mt-3 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50">
                <svg className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-red-700 dark:text-red-300">{publishReviewNotes}</p>
              </div>
            )}
          </div>

          {/* Model Selection - Compact inline style */}
          {availableModels.length > 0 && (
            <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Model</span>
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
                    <SelectTrigger className="h-9 flex-1 min-w-0 rounded-lg border-border bg-background hover:bg-muted transition-colors text-sm">
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

              {providerOptionsForSelected.length > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Select
                      value={selectedProvider || "__auto__"}
                      onValueChange={(val) => {
                        const provider = val === "__auto__" ? null : val;
                        setSelectedProvider(provider);
                        dispatchAgentModelChange(agentTag, selectedValue, provider);
                      }}
                    >
                      <SelectTrigger className="h-9 w-full rounded-lg border-border bg-background hover:bg-muted transition-colors text-sm">
                        <SelectValue placeholder="Auto (gateway default)">
                          <div className="flex items-center gap-2">
                            <ProviderAvatar providerSlug={selectedProvider || selectedMeta?.providerSlug || null} size={18} />
                            <span className="text-sm truncate capitalize">
                              {selectedProvider || selectedMeta?.defaultProvider || 'Auto'}
                            </span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__auto__">Auto (gateway default)</SelectItem>
                        {providerOptionsForSelected.map((provider) => (
                          <SelectItem key={provider} value={provider} className="capitalize">
                            {provider}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
