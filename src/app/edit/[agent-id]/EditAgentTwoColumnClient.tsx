"use client";

import * as React from "react";
import Chat from "@/components/Chat";
import { EditAgentClient } from "./EditAgentClient";
import { EditAvatarClient } from "./EditAvatarClient";
import type { ModelOption } from "@/components/ModelSelect";

interface ServerAction {
  (formData: FormData): Promise<void>;
}

interface Props {
  id: string;
  tag: string;
  initialName: string;
  initialSystemPrompt?: string;
  initialModel?: string;
  initialAvatar?: string;
  initialTagline?: string;
  initialDescription?: string;
  models: ModelOption[];
  avatars: string[];
  onSave: ServerAction;
  onDelete: ServerAction;
}

interface SendContext {
  model?: string;
  systemPrompt?: string;
  tagline?: string;
  description?: string;
}

interface LeftFormProps extends Props {
  sendContextRef: React.MutableRefObject<SendContext>;
}

function LeftForm({
  id,
  tag,
  initialName,
  initialSystemPrompt,
  initialModel,
  initialAvatar,
  initialTagline,
  initialDescription,
  models,
  avatars,
  onSave,
  onDelete,
  sendContextRef,
}: LeftFormProps) {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl mb-4">Edit Agent</h1>
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

        {/* Model + Tabs (Behaviour / Details) */}
        <EditAgentClient
          models={models}
          initialModel={initialModel}
          initialSystemPrompt={initialSystemPrompt}
          initialTagline={initialTagline}
          initialDescription={initialDescription}
          onChange={(value) => {
            sendContextRef.current.model = value;
          }}
          onContextChange={(u) => {
            if (u.model !== undefined) sendContextRef.current.model = u.model;
            if (u.systemPrompt !== undefined) sendContextRef.current.systemPrompt = u.systemPrompt;
            if (u.tagline !== undefined) sendContextRef.current.tagline = u.tagline;
            if (u.description !== undefined) sendContextRef.current.description = u.description;
          }}
        />

        <div className="flex items-center gap-3">
          <button type="submit" className="border p-2">Save</button>
          <button formAction={onDelete} className="border p-2">Delete</button>
        </div>
      </form>
    </div>
  );
}

export default function EditAgentTwoColumnClient(props: Props) {
  return <TwoColumn {...props} />;
}

function TwoColumn(props: Props) {
  const sendContextRef = React.useRef<SendContext>({
    model: props.initialModel,
    systemPrompt: props.initialSystemPrompt,
    tagline: props.initialTagline,
    description: props.initialDescription,
  });

  const getChatContext = React.useCallback(() => sendContextRef.current, []);

  return (
    <div className="mx-auto p-6 h-full grid grid-cols-1 gap-6 lg:grid-cols-2 max-w-6xl">
      <LeftForm {...props} sendContextRef={sendContextRef} />
      <div className="min-h-[60vh] h-full border rounded-md p-2">
        <Chat className="h-full" getChatContext={getChatContext} />
      </div>
    </div>
  );
}


