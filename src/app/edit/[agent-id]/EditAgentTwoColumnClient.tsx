"use client";

import * as React from "react";
import { EditAgentClient } from "./EditAgentClient";
import { EditAvatarClient } from "./EditAvatarClient";
import { buildKnowledgeSystemText } from "@/lib/knowledge";
import { getKnowledgeByAgent } from "@/actions/knowledge";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { type KnowledgeItem } from "./KnowledgeManager";

const Chat = dynamic(() => import('@/components/Chat'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
      Loading preview...
    </div>
  ),
});
import { Button } from "@/components/ui/button";

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
  initialProviderOptions?: Record<string, { order?: string[]; only?: string[] }>;
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
  initialKnowledgeItems?: KnowledgeItem[];
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
  knowledgeItems?: KnowledgeItem[];
  onKnowledgeItemsChange?: (items: KnowledgeItem[]) => void;
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
  initialProviderOptions,
  knowledgeItems,
  onKnowledgeItemsChange,
}: LeftFormProps) {
  const [nameValue, setNameValue] = React.useState(initialName);

  return (
    <div className="w-full pb-20 lg:pb-0">
      <form id="agent-form" action={onSave} className="hidden" />
      <div className="flex flex-col">
        <input type="hidden" name="id" value={id} form="agent-form" />

        {/* Floating Action Bar (Mobile Sticky / Desktop Inline) */}
        <div className="sticky top-0 z-30 flex items-center justify-between py-4 bg-background/80 backdrop-blur-md mb-8 lg:static lg:bg-transparent lg:p-0 lg:mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>

          <div className="flex items-center gap-3">
            {activeTab !== "knowledge" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  form="agent-form"
                  formAction={onDelete}
                  className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Delete Agent"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                <Button
                  type="submit"
                  form="agent-form"
                  className="rounded-full px-5 gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Hero Section: Avatar & Name */}
        <div className="mb-12 group">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 relative">
              <div className="absolute -inset-2 bg-gradient-to-br from-muted to-muted/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
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
                  className="col-start-1 row-start-1 w-full text-2xl md:text-3xl lg:text-4xl font-bold text-foreground bg-transparent border-none p-0 placeholder-muted-foreground/50 focus:ring-0 focus:outline-none focus:placeholder-muted-foreground/30 transition-colors resize-none overflow-hidden leading-tight"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                />
                <div className="absolute bottom-0 left-0 w-12 h-0.5 bg-muted group-focus-within:bg-foreground group-focus-within:w-24 transition-all duration-500" />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono text-xs tracking-tight truncate max-w-full">
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
            initialProviderOptions={initialProviderOptions}
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
            knowledgeItems={knowledgeItems}
            onKnowledgeItemsChange={onKnowledgeItemsChange}
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
  const [knowledgeItems, setKnowledgeItems] = React.useState<KnowledgeItem[] | undefined>(props.initialKnowledgeItems);
  const [knowledgeLoaded, setKnowledgeLoaded] = React.useState(props.initialKnowledgeItems !== undefined);
  const [knowledgeLoading, setKnowledgeLoading] = React.useState(false);

  const sendContextRef = React.useRef<SendContext>({
    model: props.initialModel,
    systemPrompt: props.initialSystemPrompt,
    tagline: props.initialTagline,
    description: props.initialDescription,
  });

  const getChatContext = React.useCallback(() => sendContextRef.current, []);

  // Build combined system + knowledge text live for the right-side Chat
  const knowledgeItemsForPrompt = React.useMemo(
    () => (knowledgeItems ?? []).map((item) => ({ name: item.name, content: item.content })),
    [knowledgeItems]
  );
  const combinedSystem = React.useMemo(() => {
    const sys = sendContextRef.current.systemPrompt?.trim() || "";
    const kb = buildKnowledgeSystemText(knowledgeItemsForPrompt);
    return [sys, kb.trim()].filter(Boolean).join("\n\n");
  }, [knowledgeItemsForPrompt]);

  const modelOptions = React.useMemo(
    () => [previewModel, ...(previewSecondaryModels || [])].filter((m): m is string => typeof m === 'string' && m.length > 0),
    [previewModel, previewSecondaryModels]
  );

  const loadKnowledge = React.useCallback(async () => {
    if (knowledgeLoaded || knowledgeLoading) return;
    setKnowledgeLoading(true);
    try {
      const data = await getKnowledgeByAgent(props.tag);
      setKnowledgeItems(data);
    } catch (error) {
      console.error("Failed to load knowledge for preview:", error);
      setKnowledgeItems([]);
    } finally {
      setKnowledgeLoaded(true);
      setKnowledgeLoading(false);
    }
  }, [knowledgeLoaded, knowledgeLoading, props.tag]);

  const handleKnowledgeItemsChange = React.useCallback((next: KnowledgeItem[]) => {
    setKnowledgeItems(next);
    setKnowledgeLoaded(true);
  }, []);

  React.useEffect(() => {
    if (activeTab !== "preview") return;
    void loadKnowledge();
  }, [activeTab, loadKnowledge]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-screen-xl">
        <div className="min-h-screen p-6 lg:p-12 xl:p-16 flex flex-col">
          <LeftForm
            {...props}
            sendContextRef={sendContextRef}
            onTabChange={setActiveTab}
            activeTab={activeTab}
            onModelPreviewChange={setPreviewModel}
            onSecondaryPreviewChange={setPreviewSecondaryModels}
            knowledgeItems={knowledgeItems}
            onKnowledgeItemsChange={handleKnowledgeItemsChange}
            previewNode={
              activeTab === "preview" ? (
                knowledgeLoaded ? (
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
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                    {knowledgeLoading ? "Loading knowledge..." : "Preparing preview..."}
                  </div>
                )
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
}
