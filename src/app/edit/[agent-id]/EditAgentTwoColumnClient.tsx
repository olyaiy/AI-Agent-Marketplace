"use client";

import * as React from "react";
import Chat from "@/components/Chat";
import { EditAgentClient } from "./EditAgentClient";
import { EditAvatarClient } from "./EditAvatarClient";
import { buildKnowledgeSystemText } from "@/lib/knowledge";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from 'next/link';

interface ServerAction {
  (formData: FormData): Promise<void>;
}

interface Props {
  id: string;
  tag: string;
  initialName: string;
  initialSystemPrompt?: string;
  initialModel?: string;
  initialSecondaryModels?: string[];
  initialAvatar?: string;
  initialTagline?: string;
  initialDescription?: string;
  initialVisibility?: 'public' | 'invite_only' | 'private';
  inviteCode?: string;
  isAuthenticated: boolean;
  publishStatus: 'draft' | 'pending_review' | 'approved' | 'rejected';
  publishReviewNotes?: string;
  publishRequestedAt?: string;
  avatars: string[];
  onSave: ServerAction;
  onDelete: ServerAction;
  onRequestPublic: ServerAction;
  onWithdrawPublic: ServerAction;
  knowledgeItems?: { name: string; content: string }[];
}

interface SendContext {
  model?: string;
  systemPrompt?: string;
  tagline?: string;
  description?: string;
}

interface LeftFormProps extends Props {
  sendContextRef: React.MutableRefObject<SendContext>;
  onTabChange: (tab: "behaviour" | "details" | "knowledge" | "publish" | "preview") => void;
  activeTab: "behaviour" | "details" | "knowledge" | "publish" | "preview";
  onModelPreviewChange: (model?: string) => void;
  onSecondaryPreviewChange: (models: string[]) => void;
  previewNode: React.ReactNode;
}

function LeftForm({
  id,
  tag,
  initialName,
  initialSystemPrompt,
  initialModel,
  initialSecondaryModels = [],
  initialAvatar,
  initialTagline,
  initialDescription,
  initialVisibility,
  inviteCode,
  avatars,
  onSave,
  onDelete,
  onRequestPublic,
  onWithdrawPublic,
  sendContextRef,
  onTabChange,
  activeTab,
  onModelPreviewChange,
  onSecondaryPreviewChange,
  publishStatus,
  publishReviewNotes,
  publishRequestedAt,
  previewNode,
}: LeftFormProps) {
  const [nameValue, setNameValue] = React.useState(initialName);

  return (
    <div className="w-full pb-20 lg:pb-0">
      <form id="agent-form" action={onSave} className="hidden" />
      <div className="flex flex-col">
        <input type="hidden" name="id" value={id} form="agent-form" />

        {/* Floating Action Bar (Mobile Sticky / Desktop Inline) */}
        <div className="sticky top-0 z-30 flex items-center justify-between py-4 bg-white/80 backdrop-blur-md mb-8 lg:static lg:bg-transparent lg:p-0 lg:mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>

          <div className="flex items-center gap-3">
            {activeTab !== "knowledge" && (
              <>
                <button
                  form="agent-form"
                  formAction={onDelete}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                  title="Delete Agent"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  form="agent-form"
                  className="inline-flex items-center gap-2 bg-black text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200/50"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Hero Section: Avatar & Name */}
        <div className="mb-12 group">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 relative">
              <div className="absolute -inset-2 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              <EditAvatarClient avatars={avatars} initialAvatar={initialAvatar} />
            </div>

            <div className="flex-grow space-y-3 pt-2 min-w-0">
              <div className="relative grid">
                {/* Invisible element to force height expansion */}
                <div className="col-start-1 row-start-1 whitespace-pre-wrap break-words invisible pointer-events-none text-2xl md:text-3xl lg:text-4xl font-bold p-0 leading-tight border-none" aria-hidden="true">
                  {nameValue || "Name your agent"}{" "}
                </div>

                {/* Actual Textarea */}
                <textarea
                  name="name"
                  form="agent-form"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
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

              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-mono text-xs tracking-tight truncate max-w-full">
                  {tag}
                </span>
                {publishStatus === 'approved' && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 flex-shrink-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Editor Tabs & Content */}
        <div className="pl-1">
          <EditAgentClient
            agentTag={tag}
            initialModel={initialModel}
            initialSecondaryModels={initialSecondaryModels}
            initialSystemPrompt={initialSystemPrompt}
            initialTagline={initialTagline}
            initialDescription={initialDescription}
            initialVisibility={initialVisibility}
            inviteCode={inviteCode}
            onChange={(value) => {
              sendContextRef.current.model = value;
              onModelPreviewChange(value);
            }}
            onContextChange={(u) => {
              if (u.model !== undefined) sendContextRef.current.model = u.model;
              if (u.systemPrompt !== undefined) sendContextRef.current.systemPrompt = u.systemPrompt;
              if (u.tagline !== undefined) sendContextRef.current.tagline = u.tagline;
              if (u.description !== undefined) sendContextRef.current.description = u.description;
            }}
            onTabChange={onTabChange}
            onSecondaryModelsChange={(models) => {
              onSecondaryPreviewChange(models);
            }}
            publishStatus={publishStatus}
            publishReviewNotes={publishReviewNotes}
            publishRequestedAt={publishRequestedAt}
            onRequestPublic={onRequestPublic}
            onWithdrawPublic={onWithdrawPublic}
            previewContent={previewNode}
            formId="agent-form"
          />
        </div>
      </div>
    </div>
  );
}

export default function EditAgentTwoColumnClient(props: Props) {
  return <TwoColumn {...props} />;
}

function TwoColumn(props: Props) {
  const [activeTab, setActiveTab] = React.useState<"behaviour" | "details" | "knowledge" | "publish" | "preview">("behaviour");
  const [previewModel, setPreviewModel] = React.useState<string | undefined>(props.initialModel);
  const [previewSecondaryModels, setPreviewSecondaryModels] = React.useState<string[]>(props.initialSecondaryModels || []);

  const sendContextRef = React.useRef<SendContext>({
    model: props.initialModel,
    systemPrompt: props.initialSystemPrompt,
    tagline: props.initialTagline,
    description: props.initialDescription,
  });

  const getChatContext = React.useCallback(() => sendContextRef.current, []);

  // Build combined system + knowledge text live for the right-side Chat
  const combinedSystem = React.useMemo(() => {
    const sys = sendContextRef.current.systemPrompt?.trim() || "";
    const kb = buildKnowledgeSystemText(props.knowledgeItems || []);
    return [sys, kb.trim()].filter(Boolean).join("\n\n");
  }, [props.knowledgeItems]);

  const modelOptions = React.useMemo(
    () => [previewModel, ...(previewSecondaryModels || [])].filter((m): m is string => typeof m === 'string' && m.length > 0),
    [previewModel, previewSecondaryModels]
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-screen-xl">
        <div className="min-h-screen p-6 lg:p-12 xl:p-16 flex flex-col">
          <LeftForm
            {...props}
            sendContextRef={sendContextRef}
            onTabChange={setActiveTab}
            activeTab={activeTab}
            onModelPreviewChange={setPreviewModel}
            onSecondaryPreviewChange={setPreviewSecondaryModels}
            previewNode={
              <Chat
                className="h-full"
                systemPrompt={combinedSystem}
                knowledgeText={combinedSystem}
                model={previewModel}
                modelOptions={modelOptions}
                agentTag={props.tag}
                getChatContext={getChatContext}
                isAuthenticated={props.isAuthenticated}
                showModelSelectorInPrompt
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
