"use client";

import * as React from "react";
import { OpenRouterModelSelect } from "@/components/OpenRouterModelSelect";
import { KnowledgeManager } from "./KnowledgeManager";
import { SecondaryModelsInput } from "@/components/SecondaryModelsInput";
import { Copy, Check, Globe, Lock, Users } from "lucide-react";

interface Props {
  agentTag: string;
  initialModel: string | undefined;
  initialSecondaryModels?: string[];
  initialSystemPrompt?: string;
  initialTagline?: string;
  initialDescription?: string;
  initialVisibility?: 'public' | 'invite_only' | 'private';
  inviteCode?: string;
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
  publishStatus = 'draft',
  publishReviewNotes,
  publishRequestedAt,
  onRequestPublic,
  onWithdrawPublic,
  previewContent,
  formId,
}: Props) {
  const [selectedModel, setSelectedModel] = React.useState<string>(initialModel || "");
  const [secondaryModels, setSecondaryModels] = React.useState<string[]>(initialSecondaryModels || []);
  const [activeTab, setActiveTab] = React.useState<"behaviour" | "details" | "knowledge" | "publish" | "preview">("behaviour");
  const [visibility, setVisibility] = React.useState<'public' | 'invite_only' | 'private'>(initialVisibility);
  const [copied, setCopied] = React.useState(false);
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
      <div className="flex items-center gap-1 border-b border-border pb-1 overflow-x-auto no-scrollbar">
        {(["behaviour", "details", "knowledge", "publish", "preview"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeTab === tab
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
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
            <div className="relative pl-8 space-y-8">
              {/* Vertical accent line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-border rounded-full" />

              {/* Primary Model */}
              <div className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                  <span className="text-[10px] font-bold text-primary-foreground">1</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-foreground">Primary Model</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">Required</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">The main AI brain that powers all conversations</p>
                  </div>
                  <OpenRouterModelSelect
                    value={selectedModel}
                    onChange={(value) => setSelectedModel(value)}
                    placeholder="Select a primary model..."
                    width="100%"
                    label=""
                  />
                </div>
              </div>

              {/* Secondary Models */}
              <div className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground">2</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-foreground">Secondary Models</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">Optional</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Add alternative models for users to switch between</p>
                  </div>
                  <SecondaryModelsInput
                    value={secondaryModels}
                    onChange={setSecondaryModels}
                    includeHiddenInput={false}
                    primaryModelId={selectedModel || undefined}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-lg font-semibold text-foreground">System Prompt</label>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    Define how your agent behaves, responds, and interacts. This is the core personality and instruction set.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground font-medium">Markdown</span>
                </div>
              </div>

              <div className="relative group">
                {/* Editor container with visible borders */}
                <div className="rounded-xl border-2 border-border bg-card overflow-hidden transition-all duration-200 group-focus-within:border-primary/50 group-focus-within:ring-4 group-focus-within:ring-primary/10 group-hover:border-border/80 shadow-sm">
                  {/* Header bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono ml-2">system-prompt.md</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">Core Instruction</span>
                  </div>

                  {/* Textarea */}
                  <textarea
                    name="systemPrompt"
                    form={formId}
                    defaultValue={initialSystemPrompt}
                    onInput={(e) => {
                      const value = e.currentTarget.value;
                      onContextChange && onContextChange({ systemPrompt: value });
                      setPromptStats({ chars: value.length, lines: value.split('\n').length });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const start = target.selectionStart;
                        const end = target.selectionEnd;
                        const value = target.value;
                        // Insert 2 spaces for indentation
                        target.value = value.substring(0, start) + '  ' + value.substring(end);
                        // Move cursor after the inserted spaces
                        target.selectionStart = target.selectionEnd = start + 2;
                        // Trigger the onInput handler manually
                        const newValue = target.value;
                        onContextChange && onContextChange({ systemPrompt: newValue });
                        setPromptStats({ chars: newValue.length, lines: newValue.split('\n').length });
                      }
                    }}
                    rows={14}
                    placeholder="You are a helpful assistant specialized in...

# Example structure:

## Role
Define the assistant's primary role and expertise.

## Tone
Describe the communication style (friendly, professional, etc.)

## Guidelines
- List specific behaviors
- Include any constraints
- Define response format preferences"
                    className="w-full bg-card border-0 p-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 transition-all resize-none text-sm leading-relaxed font-mono overflow-y-auto scrollbar-slick"
                    style={{ minHeight: '320px', maxHeight: '500px' }}
                  />

                  {/* Footer with character count */}
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">Tab</kbd> for indentation</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                      <span>{promptStats.lines} lines</span>
                      <span>{promptStats.chars.toLocaleString()} chars</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "details" ? (
          <div className="space-y-8">
            <div className="grid gap-6">
              <div className="space-y-3">
                <label className="block text-base font-semibold text-foreground">Tagline</label>
                <input
                  name="tagline"
                  form={formId}
                  defaultValue={initialTagline}
                  onInput={(e) => onContextChange && onContextChange({ tagline: e.currentTarget.value })}
                  placeholder="e.g., Your personal coding assistant"
                  className="w-full bg-muted/30 border-0 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:bg-muted/50 transition-all"
                />
                <p className="text-sm text-muted-foreground">A short, catchy phrase shown in lists.</p>
              </div>

              <div className="space-y-3">
                <label className="block text-base font-semibold text-foreground">Description</label>
                <textarea
                  name="description"
                  form={formId}
                  defaultValue={initialDescription}
                  onInput={(e) => onContextChange && onContextChange({ description: e.currentTarget.value })}
                  rows={8}
                  placeholder="Describe your agent&apos;s capabilities, use cases, and what makes it special..."
                  className="w-full bg-muted/30 border-0 rounded-xl p-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:bg-muted/50 transition-all resize-none"
                />
                <p className="text-sm text-muted-foreground md:w-3/4">Detailed explanation of what this agent does. This appears on the agent&apos;s profile page.</p>
              </div>
            </div>
          </div>
        ) : activeTab === "knowledge" ? (
          <div className="bg-muted/30 rounded-2xl border border-border/50 p-1">
            <KnowledgeManager agentTag={agentTag} />
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
                        form={formId}
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
                  form={formId}
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
                  form={formId}
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
      <input type="hidden" name="model" value={selectedModel || ""} form={formId} />
      <input type="hidden" name="secondaryModels" value={JSON.stringify(secondaryModels || [])} form={formId} />
      <input type="hidden" name="visibility" value={visibility} form={formId} />
    </div>
  );
});
