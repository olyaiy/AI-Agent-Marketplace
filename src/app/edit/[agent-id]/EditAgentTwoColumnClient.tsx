"use client";

import * as React from "react";
import Chat from "@/components/Chat";
import { EditAgentClient } from "./EditAgentClient";
import { EditAvatarClient } from "./EditAvatarClient";
import { buildKnowledgeSystemText } from "@/lib/knowledge";

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
  avatars: string[];
  onSave: ServerAction;
  onDelete: ServerAction;
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
  onTabChange: (tab: "behaviour" | "details" | "knowledge") => void;
  activeTab: "behaviour" | "details" | "knowledge";
  onModelPreviewChange: (model?: string) => void;
  onSecondaryPreviewChange: (models: string[]) => void;
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
  avatars,
  onSave,
  onDelete,
  sendContextRef,
  onTabChange,
  activeTab,
  onModelPreviewChange,
  onSecondaryPreviewChange,
}: LeftFormProps) {
  return (
    <div className="max-w-xl">
      <form action={onSave} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={id} />

        {/* Top: Avatar (left) and Name/Tag (right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block mb-2">Avatar</label>
            <EditAvatarClient avatars={avatars} initialAvatar={initialAvatar} />
          </div>
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span>Agent name</span>
              <input name="name" defaultValue={initialName} className="border p-2" />
            </label>
            <label className="flex flex-col gap-1">
              <span>Tag</span>
              <input disabled value={tag} className="border p-2 bg-gray-50" />
            </label>
          </div>
        </div>

        {/* Model + Tabs (Behaviour / Details / Knowledge) */}
        <EditAgentClient
          agentTag={tag}
          initialModel={initialModel}
          initialSecondaryModels={initialSecondaryModels}
          initialSystemPrompt={initialSystemPrompt}
          initialTagline={initialTagline}
          initialDescription={initialDescription}
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
        />

        {activeTab !== "knowledge" && (
          <div className="flex items-center gap-3">
            <button type="submit" className="border p-2 hover:bg-gray-50 rounded-md transition-colors">Save</button>
            <button formAction={onDelete} className="border p-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700 rounded-md transition-colors">Delete</button>
          </div>
        )}
      </form>
    </div>
  );
}

export default function EditAgentTwoColumnClient(props: Props) {
  return <TwoColumn {...props} />;
}

function TwoColumn(props: Props) {
  const [activeTab, setActiveTab] = React.useState<"behaviour" | "details" | "knowledge">("behaviour");
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

  return (
    <div className="mx-auto p-6 max-w-7xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Left column - scrollable */}
        <div className="w-full">
          <LeftForm
            {...props}
            sendContextRef={sendContextRef}
            onTabChange={setActiveTab}
            activeTab={activeTab}
            onModelPreviewChange={setPreviewModel}
            onSecondaryPreviewChange={setPreviewSecondaryModels}
          />
        </div>
        
        {/* Right column - sticky */}
        <div className="lg:sticky lg:top-6 h-[calc(100vh-3rem)] min-h-[600px]">
          <div className="h-full border rounded-lg p-2 bg-white shadow-sm">
            <Chat
              className="h-full"
              systemPrompt={combinedSystem}
              knowledgeText={combinedSystem}
              model={previewModel}
              modelOptions={[previewModel, ...(previewSecondaryModels || [])].filter(Boolean)}
              agentTag={props.tag}
              getChatContext={getChatContext}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
