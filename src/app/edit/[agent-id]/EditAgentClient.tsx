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
      <div className="flex items-center gap-1 border-b border-gray-100 pb-1 overflow-x-auto no-scrollbar">
        {["behaviour", "details", "knowledge", "publish", "preview"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeTab === tab
              ? 'bg-black text-white shadow-md shadow-gray-200'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            onClick={() => setActiveTab(tab as any)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tabs content */}
      <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "behaviour" ? (
          <div className="space-y-8">
            <div className="space-y-4 p-5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-900">Model Configuration</h3>
                <p className="text-xs text-gray-500">Choose the brain behind your agent.</p>
              </div>
              <OpenRouterModelSelect
                value={selectedModel}
                onChange={(value) => setSelectedModel(value)}
                placeholder="Select a model..."
                width="100%"
                label=""
              />
              <div className="pt-2">
                <SecondaryModelsInput
                  value={secondaryModels}
                  onChange={setSecondaryModels}
                  includeHiddenInput={false}
                  primaryModelId={selectedModel || undefined}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold text-gray-900">System Prompt</label>
                <span className="text-xs text-gray-400 font-mono">Core Instruction</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
                Define how your agent behaves, responds, and interacts. This is the core personality and instruction set.
              </p>
              <div className="relative group">
                <textarea
                  name="systemPrompt"
                  form={formId}
                  defaultValue={initialSystemPrompt}
                  onInput={(e) => onContextChange && onContextChange({ systemPrompt: e.currentTarget.value })}
                  rows={12}
                  placeholder="You are a helpful assistant specialized in..."
                  className="w-full bg-gray-50 border-0 rounded-xl p-5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-black/5 focus:bg-white transition-all resize-none text-base leading-relaxed shadow-sm group-hover:bg-gray-50/80"
                />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-1.5 bg-white rounded-md shadow-sm border border-gray-100 text-xs text-gray-400">Markdown supported</div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "details" ? (
          <div className="space-y-8">
            <div className="grid gap-6">
              <div className="space-y-3">
                <label className="block text-base font-semibold text-gray-900">Tagline</label>
                <input
                  name="tagline"
                  form={formId}
                  defaultValue={initialTagline}
                  onInput={(e) => onContextChange && onContextChange({ tagline: e.currentTarget.value })}
                  placeholder="e.g., Your personal coding assistant"
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-black/5 focus:bg-white transition-all"
                />
                <p className="text-sm text-gray-500">A short, catchy phrase shown in lists.</p>
              </div>

              <div className="space-y-3">
                <label className="block text-base font-semibold text-gray-900">Description</label>
                <textarea
                  name="description"
                  form={formId}
                  defaultValue={initialDescription}
                  onInput={(e) => onContextChange && onContextChange({ description: e.currentTarget.value })}
                  rows={8}
                  placeholder="Describe your agent's capabilities, use cases, and what makes it special..."
                  className="w-full bg-gray-50 border-0 rounded-xl p-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-black/5 focus:bg-white transition-all resize-none"
                />
                <p className="text-sm text-gray-500 md:w-3/4">Detailed explanation of what this agent does. This appears on the agent's profile page.</p>
              </div>
            </div>
          </div>
        ) : activeTab === "knowledge" ? (
          <div className="bg-gray-50/50 rounded-2xl border border-gray-100/50 p-1">
            <KnowledgeManager agentTag={agentTag} />
          </div>
        ) : activeTab === "preview" ? (
          <div className="h-[calc(100vh-300px)] min-h-[500px] bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {previewContent}
          </div>
        ) : (
          <div className="space-y-8 max-w-2xl">
            <div className="p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-900">Current Status</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${statusBadge.classes}`}>
                  {statusBadge.label}
                </div>
                {requestedDate && publishStatus === 'pending_review' && (
                  <span className="text-xs text-gray-500">
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
                <label className="text-lg font-semibold text-gray-900">Visibility Settings</label>
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
                        ? 'border-black bg-gray-50'
                        : 'border-transparent bg-white shadow-sm ring-1 ring-gray-100 hover:ring-gray-200 hover:bg-gray-50/50'
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${visibility === opt.value ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <span className={`block font-semibold text-sm ${visibility === opt.value ? 'text-gray-900' : 'text-gray-700'}`}>{opt.label}</span>
                        <span className="text-xs text-gray-500">{opt.hint}</span>
                      </div>
                      {visibility === opt.value && (
                        <div className="text-black">
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

            <div className="pt-4 border-t border-gray-100">
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
