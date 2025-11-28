"use client";

import * as React from "react";
import { OpenRouterModelSelect } from "@/components/OpenRouterModelSelect";
import { KnowledgeManager } from "./KnowledgeManager";
import { SecondaryModelsInput } from "@/components/SecondaryModelsInput";

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
  onTabChange?: (tab: "behaviour" | "details" | "knowledge" | "publish") => void;
  onSecondaryModelsChange?: (models: string[]) => void;
  publishStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  publishReviewNotes?: string;
  publishRequestedAt?: string;
  onRequestPublic?: (formData: FormData) => void | Promise<void>;
  onWithdrawPublic?: (formData: FormData) => void | Promise<void>;
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
}: Props) {
  const [selectedModel, setSelectedModel] = React.useState<string>(initialModel || "");
  const [secondaryModels, setSecondaryModels] = React.useState<string[]>(initialSecondaryModels || []);
  const [activeTab, setActiveTab] = React.useState<"behaviour" | "details" | "knowledge" | "publish">("behaviour");
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
    <div className="space-y-4">
      {/* Tabs header */}
      <div className="flex items-center gap-2 border-b">
        <button
          type="button"
          className={`px-3 py-2 text-sm ${activeTab === 'behaviour' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab("behaviour")}
        >
          Behaviour
        </button>
        <button
          type="button"
          className={`px-3 py-2 text-sm ${activeTab === 'details' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab("details")}
        >
          Details
        </button>
        <button
          type="button"
          className={`px-3 py-2 text-sm ${activeTab === 'knowledge' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab("knowledge")}
        >
          Knowledge Base
        </button>
        <button
          type="button"
          className={`px-3 py-2 text-sm ${activeTab === 'publish' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab("publish")}
        >
          Publish
        </button>
      </div>

      {/* Tabs content */}
      <div className="pt-4">
        {activeTab === "behaviour" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <OpenRouterModelSelect
                value={selectedModel}
                onChange={(value) => setSelectedModel(value)}
                placeholder="Select a model..."
                width="100%"
                label="Primary model"
              />
              <SecondaryModelsInput
                value={secondaryModels}
                onChange={setSecondaryModels}
                includeHiddenInput={false}
                primaryModelId={selectedModel || undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900">System Prompt</label>
              <p className="text-sm text-gray-500">
                Define how your agent behaves and responds. This sets the personality, tone, and expertise of your agent.
              </p>
              <textarea
                name="systemPrompt"
                defaultValue={initialSystemPrompt}
                onInput={(e) => onContextChange && onContextChange({ systemPrompt: e.currentTarget.value })}
                rows={8}
                placeholder="e.g., You are a helpful assistant specialized in..."
                className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-none text-sm"
              />
            </div>
          </div>
        ) : activeTab === "details" ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900">Tagline</label>
              <p className="text-sm text-gray-500">
                A short, catchy phrase that describes your agent in a few words.
              </p>
              <input
                name="tagline"
                defaultValue={initialTagline}
                onInput={(e) => onContextChange && onContextChange({ tagline: e.currentTarget.value })}
                placeholder="e.g., Your personal coding assistant"
                className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900">Description</label>
              <p className="text-sm text-gray-500">
                Provide a detailed description of what your agent does and how it can help users.
              </p>
              <textarea
                name="description"
                defaultValue={initialDescription}
                onInput={(e) => onContextChange && onContextChange({ description: e.currentTarget.value })}
                rows={6}
                placeholder="Describe your agent's capabilities, use cases, and what makes it special..."
                className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-none text-sm"
              />
            </div>
          </div>
        ) : activeTab === "knowledge" ? (
          <KnowledgeManager agentTag={agentTag} />
        ) : (
          <div className="space-y-4 max-w-xl">
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${statusBadge.classes}`}>
              <span className="font-semibold">{statusBadge.label}</span>
              {requestedDate && publishStatus === 'pending_review' ? (
                <span className="text-xs">
                  Requested {requestedDate.toLocaleDateString()} {requestedDate.toLocaleTimeString()}
                </span>
              ) : null}
            </div>
            {publishStatus === 'rejected' && publishReviewNotes ? (
              <p className="text-sm text-red-700">Reason: {publishReviewNotes}</p>
            ) : null}
            <p className="text-sm text-gray-700">
              Choose how people access this agent. Selecting Public submits for admin approval. While pending or rejected, invite-only links still work.
            </p>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-gray-900">Visibility</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[
                  { value: 'public', label: 'Public', hint: publishStatus === 'approved' ? 'Live in search/homepage.' : 'Submit for approval to list publicly.' },
                  { value: 'invite_only', label: 'Invite only', hint: 'Hidden from listings; share via link.' },
                  { value: 'private', label: 'Private', hint: 'Only you can access it.' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex flex-col gap-1 border rounded-md p-3 cursor-pointer transition-colors ${visibility === opt.value ? 'border-blue-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility-choice"
                        value={opt.value}
                        checked={visibility === opt.value}
                        onChange={() => setVisibility(opt.value as typeof visibility)}
                      />
                      <span className="font-semibold text-sm">{opt.label}</span>
                    </div>
                    <p className="text-xs text-gray-600">{opt.hint}</p>
                  </label>
                ))}
              </div>
              {visibility === 'invite_only' && (
                <div className="rounded-md border border-dashed p-3 bg-gray-50 space-y-2">
                  {inviteUrl ? (
                    <>
                      <p className="text-xs text-gray-700">Share this link to give people access:</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          readOnly
                          value={inviteUrl}
                          className="flex-1 border rounded px-2 py-1 text-xs bg-white"
                          onFocus={(e) => e.currentTarget.select()}
                        />
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
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          {copied ? 'Copied!' : 'Copy link'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-700">Save changes to generate a shareable invite link.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {publishStatus === 'pending_review' ? (
                <button
                  type="submit"
                  formAction={onWithdrawPublic}
                  className="border px-3 py-2 rounded-md text-sm hover:bg-amber-50 hover:border-amber-200"
                >
                  Withdraw request
                </button>
              ) : publishStatus === 'approved' ? (
                <button
                  type="button"
                  className="border px-3 py-2 rounded-md text-sm text-gray-500 cursor-default"
                  disabled
                >
                  Already approved
                </button>
              ) : (
                <button
                  type="submit"
                  formAction={onRequestPublic}
                  className="border px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
                  disabled={visibility !== 'public'}
                  title={visibility === 'public' ? undefined : 'Select Public to submit for approval'}
                >
                  Request public listing
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <input type="hidden" name="model" value={selectedModel || ""} />
      <input type="hidden" name="secondaryModels" value={JSON.stringify(secondaryModels || [])} />
      <input type="hidden" name="visibility" value={visibility} />
    </div>
  );
});
