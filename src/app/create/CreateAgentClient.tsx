"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Eye, Check, Globe, Lock, Users } from "lucide-react";
import Chat from "@/components/Chat";
import { AvatarPicker } from "@/components/avatar-picker";
import { OpenRouterModelSelect } from "@/components/OpenRouterModelSelect";
import { SecondaryModelsInput } from "@/components/SecondaryModelsInput";
import { createAgent } from "@/actions/agents";

interface Props {
  avatars: string[];
}

interface SendContext {
  model?: string;
  systemPrompt?: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreateAgentClient({ avatars }: Props) {
  // Form State
  const [name, setName] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [isTagEdited, setIsTagEdited] = React.useState(false);
  const [systemPrompt, setSystemPrompt] = React.useState("");
  const [selectedModelId, setSelectedModelId] = React.useState<string>("");
  const [secondaryModels, setSecondaryModels] = React.useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = React.useState<string | undefined>(undefined);
  const [visibility, setVisibility] = React.useState<'public' | 'invite_only' | 'private'>('private');
  const visibilityOptions: Array<{ value: 'public' | 'invite_only' | 'private'; label: string; icon: typeof Globe; hint: string }> = [
    { value: 'public', label: 'Public', icon: Globe, hint: 'Listed & Searchable' },
    { value: 'invite_only', label: 'Invite Only', icon: Users, hint: 'Share via Link' },
    { value: 'private', label: 'Private', icon: Lock, hint: 'Only You' },
  ];

  // UI State
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Chat Context for Preview
  const sendContextRef = React.useRef<SendContext>({});

  // Derived State
  const derivedTag = React.useMemo(() => (name ? `@${slugify(name)}` : ''), [name]);

  // Effects
  React.useEffect(() => {
    if (!isTagEdited) setTag(derivedTag);
  }, [derivedTag, isTagEdited]);

  React.useEffect(() => {
    sendContextRef.current.model = selectedModelId || undefined;
    sendContextRef.current.systemPrompt = systemPrompt;
  }, [selectedModelId, systemPrompt]);

  // Pick random avatar
  React.useEffect(() => {
    if (!selectedAvatar && avatars && avatars.length > 0) {
      const idx = Math.floor(Math.random() * avatars.length);
      setSelectedAvatar(avatars[idx]);
    }
  }, [avatars, selectedAvatar]);

  const getChatContext = React.useCallback(() => sendContextRef.current, []);

  const selectedAvatarFile = React.useMemo(() => {
    if (!selectedAvatar) return undefined;
    const parts = selectedAvatar.split("/");
    return parts[parts.length - 1] || undefined;
  }, [selectedAvatar]);

  // Submit Handler
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const cleanTag = tag.startsWith('@') ? tag : `@${tag}`;
      const normalizedTag = cleanTag.replace(/\s+/g, '').toLowerCase();

      const res = await createAgent({
        tag: normalizedTag,
        name: name.trim(),
        systemPrompt: systemPrompt.trim(),
        model: selectedModelId,
        secondaryModels,
        avatar: selectedAvatarFile,
        visibility,
      });

      if (res?.ok) {
        window.location.assign(`/agent/${encodeURIComponent(normalizedTag.slice(1))}`);
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-screen-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">

          {/* Left Editor Pane */}
          <div className="lg:col-span-7 xl:col-span-6 p-6 lg:p-12 xl:p-16 flex flex-col">
            <form onSubmit={onSubmit} className="flex flex-col h-full">

              {/* Sticky Header */}
              <div className="sticky top-0 z-30 flex items-center justify-between py-4 bg-white/80 backdrop-blur-md mb-8 lg:static lg:bg-transparent lg:p-0 lg:mb-10">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </Link>

                <button
                  type="submit"
                  disabled={isSubmitting || !name}
                  className="inline-flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200/50 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Create Agent'}</span>
                </button>
              </div>

              {/* Hero Section: Avatar & Name */}
              <div className="mb-12 group">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 relative">
                    <div className="absolute -inset-2 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    <AvatarPicker
                      avatars={avatars}
                      value={selectedAvatar}
                      onChange={setSelectedAvatar}
                      className="rounded-full w-28 h-28 border-gray-100 shadow-sm"
                    />
                  </div>

                  <div className="flex-grow space-y-3 pt-2 min-w-0">
                    <div className="relative grid">
                      {/* Invisible element to force height expansion */}
                      <div className="col-start-1 row-start-1 whitespace-pre-wrap break-words invisible pointer-events-none text-2xl md:text-3xl lg:text-4xl font-bold p-0 leading-tight border-none" aria-hidden="true">
                        {name || "Name your agent"}{" "}
                      </div>

                      {/* Actual Textarea */}
                      <textarea
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name your agent"
                        rows={1}
                        className="col-start-1 row-start-1 w-full text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 bg-transparent border-none p-0 placeholder-gray-300 focus:ring-0 focus:outline-none focus:placeholder-gray-200 transition-colors resize-none overflow-hidden leading-tight"
                        autoComplete="off"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                      />
                      <div className="absolute bottom-0 left-0 w-12 h-0.5 bg-gray-100 group-focus-within:bg-black group-focus-within:w-24 transition-all duration-500" />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        value={tag}
                        onChange={(e) => {
                          setTag(e.target.value);
                          setIsTagEdited(true);
                        }}
                        placeholder="@tag"
                        className="text-sm font-mono text-gray-500 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-300 w-full max-w-[200px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Form Fields */}
              <div className="space-y-10 pl-1">

                {/* Model Selection */}
                <div className="space-y-4">
                  <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100/50 space-y-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-900">Intelligence Model</label>
                      <p className="text-xs text-gray-500">Select the AI model that powers your agent&apos;s responses.</p>
                    </div>

                    <OpenRouterModelSelect
                      value={selectedModelId}
                      onChange={setSelectedModelId}
                      placeholder="Select a primary model..."
                      width="100%"
                    />

                    <div className="pt-2 border-t border-gray-100 dashed">
                      <SecondaryModelsInput
                        value={secondaryModels}
                        onChange={setSecondaryModels}
                        primaryModelId={selectedModelId}
                      />
                    </div>
                  </div>
                </div>

                {/* System Prompt */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-900">System Prompt</label>
                    <span className="text-xs text-gray-400">Markdown supported</span>
                  </div>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="You are a helpful assistant who loves..."
                    rows={12}
                    className="w-full p-5 bg-gray-50 border-0 rounded-2xl text-base text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-black/5 transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Visibility */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-gray-900">Visibility</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {visibilityOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className={`relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${visibility === opt.value
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-transparent bg-gray-50/50 hover:bg-gray-100 text-gray-500'
                          }`}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value={opt.value}
                          checked={visibility === opt.value}
                          onChange={() => setVisibility(opt.value)}
                          className="sr-only"
                        />
                        <div className={`p-3 rounded-full ${visibility === opt.value ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900' : 'bg-gray-100 text-gray-400'}`}>
                          <opt.icon className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <span className={`block text-sm font-bold ${visibility === opt.value ? 'text-gray-900' : 'text-gray-500'}`}>
                            {opt.label}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide font-medium text-gray-400 mt-1 block">
                            {opt.hint}
                          </span>
                        </div>
                        {visibility === opt.value && (
                          <div className="absolute top-3 right-3 text-black">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

              </div>

              <div className="h-20" /> {/* Bottom spacer */}
            </form>
          </div>

          {/* Right Preview Pane (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-6 bg-gray-50/50 border-l border-gray-100 relative">
            <div className="sticky top-0 h-screen p-8 xl:p-12 flex flex-col">
              <div className="flex items-center gap-2 mb-6 text-gray-400 text-sm font-medium uppercase tracking-wider pl-2">
                <Eye className="w-4 h-4" />
                <span>Live Preview</span>
              </div>
              <div className="flex-1 bg-white rounded-3xl shadow-2xl shadow-gray-200/50 overflow-hidden ring-1 ring-black/5 border border-gray-100">
                <Chat
                  className="h-full"
                  getChatContext={getChatContext}
                  model={selectedModelId}
                  modelOptions={[selectedModelId, ...secondaryModels].filter(Boolean)}
                  avatarUrl={selectedAvatarFile ? `/avatars/${selectedAvatarFile}` : undefined}
                />
              </div>
              {/* Device decorative elements */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-200 rounded-full opacity-50 pointer-events-none" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
