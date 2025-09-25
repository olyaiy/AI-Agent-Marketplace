"use client";

import * as React from "react";
import { ModelSelect } from "@/components/ModelSelect";
import type { ModelOption } from "@/components/ModelSelect";
import { AgentForm } from "./AgentForm";
import { AvatarPicker } from "@/components/avatar-picker";
import Chat from "@/components/Chat";

interface Props {
  models: ModelOption[];
  avatars: string[];
}

interface SendContext {
  model?: string;
  systemPrompt?: string;
}

export function CreateAgentClient({ models, avatars }: Props) {
  const [selectedCompositeId, setSelectedCompositeId] = React.useState<string | undefined>(undefined);
  const [selectedAvatar, setSelectedAvatar] = React.useState<string | undefined>(undefined);

  const sendContextRef = React.useRef<SendContext>({});

  const selectedAgentModel = React.useMemo(() => {
    if (!selectedCompositeId) return undefined;
    const [provider, modelId] = selectedCompositeId.split(":");
    if (!provider || !modelId) return undefined;
    return `${provider}/${modelId}`;
  }, [selectedCompositeId]);

  React.useEffect(() => {
    sendContextRef.current.model = selectedAgentModel;
  }, [selectedAgentModel]);

  // Pick a random avatar on first load if none selected yet
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

  return (
    <div className="mx-auto p-0 h-full grid grid-cols-1 gap-6 lg:grid-cols-2 max-w-6xl">
      <div className="max-w-xl">
        <div className="mb-4">
          <ModelSelect
            models={models}
            value={selectedCompositeId}
            onChange={(value) => {
              setSelectedCompositeId(value);
              if (value) {
                const [provider, modelId] = value.split(":");
                if (provider && modelId) {
                  sendContextRef.current.model = `${provider}/${modelId}`;
                }
              } else {
                sendContextRef.current.model = undefined;
              }
            }}
            showLogos
          />
        </div>
        <div className="mb-4">
          <div className="mb-2 text-sm font-medium">Avatar</div>
          <AvatarPicker avatars={avatars} value={selectedAvatar} onChange={setSelectedAvatar} />
        </div>
        <AgentForm
          model={selectedAgentModel}
          avatar={selectedAvatarFile}
          onSystemPromptChange={(value) => {
            sendContextRef.current.systemPrompt = value;
          }}
        />
      </div>
      <div className="min-h-[60vh] h-full border rounded-md p-2">
        <Chat className="h-full" getChatContext={getChatContext} />
      </div>
    </div>
  );
}


