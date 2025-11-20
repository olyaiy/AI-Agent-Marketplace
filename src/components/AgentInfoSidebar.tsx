'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Pencil } from 'lucide-react';
import { dispatchAgentModelChange, dispatchAgentNewChat } from '@/lib/agent-events';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as LobehubIcons from '@lobehub/icons';

const PROVIDER_ICON_MAP: Record<string, any> = {
  openai: LobehubIcons.OpenAI,
  anthropic: LobehubIcons.Claude,
  google: LobehubIcons.Gemini,
  gemini: LobehubIcons.Gemini,
  meta: LobehubIcons.Meta,
  mistral: LobehubIcons.Mistral,
  cohere: LobehubIcons.Cohere,
  perplexity: LobehubIcons.Perplexity,
  deepseek: LobehubIcons.DeepSeek,
  xai: LobehubIcons.XAI,
  baidu: LobehubIcons.Baidu,
  bytedance: LobehubIcons.ByteDance,
  qwen: LobehubIcons.Qwen,
  huggingface: LobehubIcons.HuggingFace,
  groq: LobehubIcons.Groq,
  openrouter: LobehubIcons.OpenRouter,
  nvidia: LobehubIcons.Nvidia,
  sambanova: LobehubIcons.SambaNova,
  fireworks: LobehubIcons.Fireworks,
  together: LobehubIcons.Together,
  moonshotai: LobehubIcons.Moonshot,
  'z.ai': LobehubIcons.ZAI,
  zai: LobehubIcons.ZAI,
};

function deriveProviderSlug(name: string | null | undefined, id: string) {
  if (name) {
    const m = name.match(/^([^:]+):/);
    if (m) return m[1].trim().toLowerCase();
  }
  const fromId = id.includes('/') ? id.split('/')[0] : '';
  return fromId.trim().toLowerCase() || null;
}

function getDisplayName(fullName: string | undefined, id: string) {
  if (fullName && fullName.includes(':')) {
    return fullName.split(':').slice(1).join(':').trim() || fullName;
  }
  if (id.includes('/')) return id.split('/').slice(1).join('/').trim() || id;
  return fullName || id;
}

const ProviderAvatar = React.memo(function ProviderAvatar({ providerSlug, size = 18 }: { providerSlug: string | null; size?: number }) {
  const slug = providerSlug || '';
  const IconObj = PROVIDER_ICON_MAP[slug] || (LobehubIcons as Record<string, unknown>)[slug];
  if (!IconObj) {
    return (
      <div className="rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 text-white flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.55 }}>
        {slug ? slug.charAt(0).toUpperCase() : '∗'}
      </div>
    );
  }
  type IconLike = React.ComponentType<{ size?: number; className?: string }> & { Avatar?: React.ComponentType<{ size?: number; className?: string }> };
  const Comp = IconObj as IconLike;
  const AvatarComp = Comp.Avatar || Comp;
  return <AvatarComp size={size} className="shrink-0" />;
});
ProviderAvatar.displayName = 'ProviderAvatar';

const ModelLabel = React.memo(function ModelLabel({ label, providerSlug }: { label: string; providerSlug: string | null }) {
  return (
    <div className="flex items-center gap-2 truncate">
      <ProviderAvatar providerSlug={providerSlug} />
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
}

export default function AgentInfoSidebar({ name, avatarUrl, tagline, description, variant = 'sidebar', agentTag, canEdit, modelOptions, activeModel }: AgentInfoSidebarProps) {
  const effectiveTagline = (tagline && tagline.trim().length > 0) ? tagline : 'Your creative thinking partner';
  const effectiveDescription = (description && description.trim().length > 0)
    ? description
    : `Hi there! I'm ${name}, your friendly AI companion. I love helping with creative projects, brainstorming ideas, and turning thoughts into reality.`;
  
  // Extract agent ID from tag (remove @ prefix)
  const agentId = agentTag ? agentTag.replace('@', '') : null;
  const availableModels = React.useMemo(
    () => Array.isArray(modelOptions) ? Array.from(new Set(modelOptions.filter(Boolean))) : [],
    [modelOptions]
  );
  const [selectedModel, setSelectedModel] = React.useState<string | undefined>(() => activeModel || availableModels[0]);
  const [modelMeta, setModelMeta] = React.useState<Record<string, { label: string; providerSlug: string | null }>>({});
  React.useEffect(() => {
    if (!selectedModel) {
      const first = activeModel || availableModels[0];
      if (first) setSelectedModel(first);
      return;
    }
    // keep selection if still available, otherwise fall back
    if (selectedModel && availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      const next = availableModels[0];
      setSelectedModel(next);
      if (next) dispatchAgentModelChange(agentTag, next);
    }
  }, [availableModels, activeModel, selectedModel, agentTag]);

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
            aria-label="New chat"
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
        <p className="text-xs text-gray-500 font-mono">
          {agentTag}
        </p>
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
        <p className="text-sm text-gray-600 leading-relaxed">
          {effectiveDescription}
        </p>
      </div>

    </div>
  );
}
