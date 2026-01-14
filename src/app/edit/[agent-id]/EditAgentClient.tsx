"use client";

import * as React from "react";
import { OpenRouterModelSelect } from "@/components/OpenRouterModelSelect";
import { KnowledgeManager, type KnowledgeItem } from "./KnowledgeManager";
import { SecondaryModelsInput } from "@/components/SecondaryModelsInput";
import { Copy, Check, Globe, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

// Dynamically import Tiptap to avoid SSR issues
const TiptapMarkdownEditor = dynamic(
  () => import('@/components/TiptapMarkdownEditor').then(mod => mod.TiptapMarkdownEditor),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-sm text-muted-foreground animate-pulse">
        Loading editor...
      </div>
    )
  }
);

interface Props {
  agentTag: string;
  initialModel: string | undefined;
  initialSecondaryModels?: string[];
  initialSystemPrompt?: string;
  initialTagline?: string;
  initialDescription?: string;
  initialVisibility?: 'public' | 'invite_only' | 'private';
  inviteCode?: string;
  initialProviderOptions?: Record<string, { order?: string[]; only?: string[] }>;
  onChange?: (model: string | undefined) => void;
  onContextChange?: (update: { model?: string; systemPrompt?: string; tagline?: string; description?: string }) => void;
  onTabChange?: (tab: "behaviour" | "details" | "knowledge" | "publish" | "preview") => void;
  onSecondaryModelsChange?: (models: string[]) => void;
  publishStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  publishReviewNotes?: string;
  publishRequestedAt?: string;
  onRequestPublic?: (formData: FormData) => void | Promise<void>;
  onWithdrawPublic?: (formData: FormData) => void | Promise<void>;
  formId?: string;
  previewContent?: React.ReactNode;
  knowledgeItems?: KnowledgeItem[];
  onKnowledgeItemsChange?: (items: KnowledgeItem[]) => void;
}

export const EditAgentClient = React.memo(function EditAgentClient({
  agentTag,
  initialModel,
  initialSecondaryModels = [],
  initialSystemPrompt,
  initialTagline,
  initialDescription,
  initialVisibility = 'private',
  inviteCode,
  onChange,
  onContextChange,
  onTabChange,
  onSecondaryModelsChange,
  initialProviderOptions,
  publishStatus = 'draft',
  publishReviewNotes,
  publishRequestedAt,
  onRequestPublic,
  onWithdrawPublic,
  previewContent,
  formId,
  knowledgeItems,
  onKnowledgeItemsChange,
}: Props) {
  const resolvedFormId = formId || 'agent-form';
  const [selectedModel, setSelectedModel] = React.useState<string>(initialModel || "");
  const [secondaryModels, setSecondaryModels] = React.useState<string[]>(initialSecondaryModels || []);
  const [providerSelections, setProviderSelections] = React.useState<Record<string, string | null>>(() => {
    const incoming = initialProviderOptions || {};
    const next: Record<string, string | null> = {};
    Object.entries(incoming).forEach(([modelId, cfg]) => {
      const preferred = (cfg?.order && cfg.order[0]) || (cfg?.only && cfg.only[0]);
      const clean = typeof preferred === 'string' ? preferred.trim().toLowerCase() : '';
      if (clean.length > 0) {
        next[modelId] = clean;
      }
    });
    return next;
  });
  const [activeTab, setActiveTab] = React.useState<"behaviour" | "details" | "knowledge" | "publish" | "preview">("behaviour");
  const [visibility, setVisibility] = React.useState<'public' | 'invite_only' | 'private'>(initialVisibility);
  const [copied, setCopied] = React.useState(false);
  const [promptValue, setPromptValue] = React.useState(initialSystemPrompt || '');
  const [promptStats, setPromptStats] = React.useState(() => {
    const text = initialSystemPrompt || '';
    return { chars: text.length, lines: text.split('\n').length };
  });

  React.useEffect(() => {
    if (onChange) onChange(selectedModel || undefined);
    if (onContextChange) onContextChange({ model: selectedModel || undefined });
  }, [selectedModel, onChange, onContextChange]);

  React.useEffect(() => {
    if (onTabChange) onTabChange(activeTab);
  }, [activeTab, onTabChange]);

  React.useEffect(() => {
    if (onSecondaryModelsChange) onSecondaryModelsChange(secondaryModels);
  }, [secondaryModels, onSecondaryModelsChange]);

  const handleProviderChange = React.useCallback((modelId: string, provider: string | null) => {
    if (!modelId) return;
    setProviderSelections((prev) => {
      const next = { ...prev };
      if (!provider) {
        delete next[modelId];
      } else {
        next[modelId] = provider;
      }
      return next;
    });
  }, []);

  const activeModelIds = React.useMemo(() => {
    const set = new Set<string>();
    if (selectedModel) set.add(selectedModel);
    secondaryModels.filter(Boolean).forEach((m) => set.add(m));
    return set;
  }, [secondaryModels, selectedModel]);

  const providerOptionsMap = React.useMemo(() => {
    const map: Record<string, { order: string[]; only: string[] }> = {};
    Object.entries(providerSelections).forEach(([modelId, provider]) => {
      if (!activeModelIds.has(modelId)) return;
      const clean = typeof provider === 'string' ? provider.trim().toLowerCase() : '';
      if (!clean) return;
      map[modelId] = { order: [clean], only: [clean] };
    });
    return map;
  }, [activeModelIds, providerSelections]);

  const inviteUrl = React.useMemo(() => {
    if (visibility !== 'invite_only') return '';
    if (!inviteCode) return '';
    if (typeof window === 'undefined') return '';
    const agentId = agentTag.replace('@', '');
    return `${window.location.origin}/agent/${encodeURIComponent(agentId)}?invite=${inviteCode}`;
  }, [agentTag, inviteCode, visibility]);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const requestedDate = React.useMemo(() => publishRequestedAt ? new Date(publishRequestedAt) : null, [publishRequestedAt]);
  const statusBadge = React.useMemo(() => {
    switch (publishStatus) {
      case 'approved':
        return { label: 'Approved – public', classes: 'bg-green-50 text-green-700 border-green-200' };
      case 'pending_review':
        return { label: 'Pending review', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'rejected':
        return { label: 'Rejected', classes: 'bg-red-50 text-red-700 border-red-200' };
      default:
        return { label: 'Not public', classes: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  }, [publishStatus]);

  return (
    <div className="space-y-8">
      {/* Modern minimal tabs */}
      <div className="relative flex items-center gap-0.5 overflow-x-auto no-scrollbar">
        {/* Background track */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-border" />

        {(["behaviour", "details", "knowledge", "publish", "preview"] as const).map((tab) => (
          <Button
            key={tab}
            type="button"
            variant="ghost"
            className={`relative px-4 py-2.5 h-auto text-sm font-medium rounded-none rounded-t-lg transition-all whitespace-nowrap hover:bg-muted/50 ${activeTab === tab
              ? 'text-foreground bg-muted/30'
              : 'text-muted-foreground hover:text-foreground'
              }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {/* Active indicator */}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}
          </Button>
        ))}
      </div>

      {/* Tabs content */}
      <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "behaviour" ? (
          <div className="space-y-8">
            {/* Model Configuration - Timeline Style (No Cards) */}
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Model Configuration</h3>
              <p className="text-sm text-muted-foreground">Choose the AI models that power your agent.</p>
            </div>

            {/* Timeline container */}
            <div className="relative pl-10 space-y-10">
              {/* Vertical connector line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />
              {/* Animated progress overlay - fills based on selection */}
              <div
                className="absolute left-[15px] top-4 w-px bg-gradient-to-b from-primary to-primary/50 transition-all duration-500 ease-out rounded-full"
                style={{ height: selectedModel ? '100%' : '0%' }}
              />

              {/* Primary Model */}
              <div className="relative group">
                {/* Timeline node */}
                <div className={`absolute -left-10 top-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${selectedModel
                  ? 'bg-primary shadow-lg shadow-primary/30 ring-4 ring-primary/10'
                  : 'bg-muted border-2 border-border group-hover:border-primary/50 group-hover:bg-primary/5'
                  }`}>
                  {selectedModel ? (
                    <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-foreground">Primary Model</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${selectedModel ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-primary/10 text-primary'
                        }`}>
                        {selectedModel ? 'Selected' : 'Required'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">The main AI brain that powers all conversations</p>
                  </div>
                  <OpenRouterModelSelect
                    value={selectedModel}
                    onChange={(value) => setSelectedModel(value)}
                    placeholder="Select a primary model..."
                    width="100%"
                    label=""
                    providerSelections={providerSelections}
                    onProviderChange={handleProviderChange}
                  />
                </div>
              </div>

              {/* Secondary Models */}
              <div className="relative group">
                {/* Timeline node */}
                <div className={`absolute -left-10 top-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${secondaryModels.length > 0
                  ? 'bg-primary/80 shadow-md shadow-primary/20 ring-4 ring-primary/10'
                  : 'bg-muted border-2 border-border group-hover:border-muted-foreground/30'
                  }`}>
                  {secondaryModels.length > 0 ? (
                    <span className="text-xs font-bold text-primary-foreground">+{secondaryModels.length}</span>
                  ) : (
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-foreground">Secondary Models</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${secondaryModels.length > 0 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
                        }`}>
                        {secondaryModels.length > 0 ? `${secondaryModels.length} added` : 'Optional'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Add alternative models for users to switch between</p>
                  </div>
                  <SecondaryModelsInput
                    value={secondaryModels}
                    onChange={setSecondaryModels}
                    includeHiddenInput={false}
                    primaryModelId={selectedModel || undefined}
                    providerSelections={providerSelections}
                    onProviderChange={handleProviderChange}
                  />
                </div>
              </div>

              {/* System Prompt - Step 3 */}
              <div className="relative group">
                {/* Timeline node */}
                <div className={`absolute -left-10 top-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${promptStats.chars > 0
                  ? 'bg-primary shadow-lg shadow-primary/30 ring-4 ring-primary/10'
                  : 'bg-muted border-2 border-border group-hover:border-primary/50 group-hover:bg-primary/5'
                  }`}>
                  {promptStats.chars > 0 ? (
                    <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-foreground">System Prompt</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${promptStats.chars > 0 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-primary/10 text-primary'
                        }`}>
                        {promptStats.chars > 0 ? `${promptStats.lines} lines` : 'Required'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">Markdown</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Define how your agent behaves, responds, and interacts</p>
                  </div>

                  {/* Editor container */}
                  <div className="rounded-xl border-2 border-border bg-card overflow-hidden transition-all duration-200 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 shadow-sm">
                    {/* Header bar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                          <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">system-prompt.md</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{promptStats.chars.toLocaleString()} chars</span>
                    </div>

                    {/* Tiptap WYSIWYG Editor */}
                    <div className="p-4">
                      <TiptapMarkdownEditor
                        initialContent={initialSystemPrompt}
                        placeholder={`You are a helpful assistant specialized in...

# Example structure:

## Role
Define the assistant's primary role and expertise.

## Tone
Describe the communication style (friendly, professional, etc.)

## Guidelines
- List specific behaviors
- Include any constraints
- Define response format preferences`}
                        onChange={(markdown) => {
                          setPromptValue(markdown);
                          onContextChange && onContextChange({ systemPrompt: markdown });
                          setPromptStats({ chars: markdown.length, lines: markdown.split('\n').length });
                        }}
                        minHeight="200px"
                        maxHeight="70vh"
                      />
                    </div>

                    {/* Hidden input for form submission */}
                    <input type="hidden" name="systemPrompt" form={resolvedFormId} value={promptValue} />

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Markdown shortcuts: <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">#</kbd> heading, <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">**</kbd> bold, <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">-</kbd> list</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                        <span>{promptStats.lines} lines</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "details" ? (
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Agent Details</h3>
              <p className="text-sm text-muted-foreground">Information displayed on your agent&apos;s public profile.</p>
            </div>

            {/* Tagline Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground">Tagline</label>
                  <p className="text-xs text-muted-foreground">A short, catchy phrase shown in lists</p>
                </div>
              </div>
              <div className="relative">
                <input
                  name="tagline"
                  form={resolvedFormId}
                  defaultValue={initialTagline}
                  onInput={(e) => onContextChange && onContextChange({ tagline: e.currentTarget.value })}
                  placeholder="e.g., Your personal coding assistant"
                  maxLength={100}
                  className="w-full bg-card border-2 border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                  <span className="opacity-50">max 100</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/50" />

            {/* Description Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground">Description</label>
                  <p className="text-xs text-muted-foreground">Detailed explanation shown on your agent&apos;s profile page</p>
                </div>
              </div>
              <div className="relative group">
                <textarea
                  name="description"
                  form={resolvedFormId}
                  defaultValue={initialDescription}
                  onInput={(e) => onContextChange && onContextChange({ description: e.currentTarget.value })}
                  rows={8}
                  placeholder="Describe your agent's capabilities, use cases, and what makes it special...

For example:
• What problems does it solve?
• Who is it for?
• What makes it unique?"
                  className="w-full bg-card border-2 border-border rounded-xl p-4 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all resize-none scrollbar-slick"
                  style={{ minHeight: '200px' }}
                />
              </div>
            </div>

            {/* Tips Section */}
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Tips for a great profile</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Keep your tagline concise and memorable</li>
                    <li>• Highlight your agent&apos;s unique capabilities in the description</li>
                    <li>• Use clear, simple language to explain what your agent does</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "knowledge" ? (
          <div className="bg-muted/30 rounded-2xl border border-border/50 p-1">
            <KnowledgeManager
              agentTag={agentTag}
              initialItems={knowledgeItems}
              onItemsChange={onKnowledgeItemsChange}
            />
          </div>
        ) : activeTab === "preview" ? (
          <div className="h-[calc(100vh-300px)] min-h-[500px] bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            {previewContent}
          </div>
        ) : (
          <div className="space-y-8 max-w-2xl">
            <div className="p-5 bg-gradient-to-br from-muted/50 to-card rounded-2xl border border-border space-y-4">
              <h3 className="font-semibold text-foreground">Current Status</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${statusBadge.classes}`}>
                  {statusBadge.label}
                </div>
                {requestedDate && publishStatus === 'pending_review' && (
                  <span className="text-xs text-muted-foreground">
                    Requested {requestedDate.toLocaleDateString()}
                  </span>
                )}
              </div>

              {publishStatus === 'rejected' && publishReviewNotes && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-sm text-red-800 flex items-start gap-2">
                  <div className="bg-red-200 text-red-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">!</div>
                  <div><span className="font-semibold block mb-1">Feedback:</span> {publishReviewNotes}</div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold text-foreground">Visibility Settings</label>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'public', label: 'Public', hint: 'Visible to everyone. Requires approval.', icon: Globe },
                  { value: 'invite_only', label: 'Invite only', hint: 'Accessible via invite link only.', icon: Users },
                  { value: 'private', label: 'Private', hint: 'Only visible to you.', icon: Lock },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.value}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${visibility === opt.value
                        ? 'border-foreground bg-muted'
                        : 'border-transparent bg-card shadow-sm ring-1 ring-border hover:ring-border/80 hover:bg-muted/30'
                        }`}
                    >
                      <input
                        type="radio"
                        name="visibility-choice"
                        form={resolvedFormId}
                        value={opt.value}
                        checked={visibility === opt.value}
                        onChange={() => setVisibility(opt.value as typeof visibility)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${visibility === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <span className={`block font-semibold text-sm ${visibility === opt.value ? 'text-foreground' : 'text-foreground/80'}`}>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.hint}</span>
                      </div>
                      {visibility === opt.value && (
                        <div className="text-foreground">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>

              {visibility === 'invite_only' && (
                <div className="mt-4 p-5 rounded-2xl bg-blue-50/50 border border-blue-100/50 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-sm font-semibold text-blue-900">Invite Link</h4>
                  {inviteUrl ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-blue-100 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 truncate">
                        {inviteUrl}
                      </div>
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
                        className="p-2 bg-white border border-blue-100 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                        title="Copy link"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-blue-700 italic">Save changes to generate your invite link.</p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              {publishStatus === 'pending_review' ? (
                <button
                  type="submit"
                  form={resolvedFormId}
                  formAction={onWithdrawPublic}
                  className="px-5 py-2.5 rounded-full text-sm font-medium border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  Withdraw request
                </button>
              ) : publishStatus === 'approved' ? (
                <span className="inline-flex items-center px-4 py-2 text-sm text-green-700 bg-green-50 rounded-full border border-green-100 font-medium">
                  <Check className="w-4 h-4 mr-2" />
                  Currently Public
                </span>
              ) : (
                <button
                  type="submit"
                  form={resolvedFormId}
                  formAction={onRequestPublic}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm ${visibility === 'public'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  disabled={visibility !== 'public'}
                >
                  Request Public Listing
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <input type="hidden" name="model" value={selectedModel || ""} form={resolvedFormId} />
      <input type="hidden" name="secondaryModels" value={JSON.stringify(secondaryModels || [])} form={resolvedFormId} />
      <input type="hidden" name="providerOptions" value={JSON.stringify(providerOptionsMap)} form={resolvedFormId} />
      <input type="hidden" name="visibility" value={visibility} form={resolvedFormId} />
    </div >
  );
});
