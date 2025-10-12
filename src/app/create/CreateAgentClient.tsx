"use client";

import * as React from "react";
import { OpenRouterModelSelect } from "@/components/OpenRouterModelSelect";
import { AgentForm } from "./AgentForm";
import { AvatarPicker } from "@/components/avatar-picker";
import Chat from "@/components/Chat";

interface Props {
  avatars: string[];
}

interface SendContext {
  model?: string;
  systemPrompt?: string;
}

export function CreateAgentClient({ avatars }: Props) {
  const [selectedModelId, setSelectedModelId] = React.useState<string>("");
  const [selectedAvatar, setSelectedAvatar] = React.useState<string | undefined>(undefined);

  const sendContextRef = React.useRef<SendContext>({});

  React.useEffect(() => {
    sendContextRef.current.model = selectedModelId || undefined;
  }, [selectedModelId]);

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
          <OpenRouterModelSelect
            value={selectedModelId}
            onChange={(value) => {
              setSelectedModelId(value);
              sendContextRef.current.model = value || undefined;
            }}
            placeholder="Select a model..."
            width="100%"
            label="Model"
          />
        </div>
        <div className="mb-4">
          <div className="mb-2 text-sm font-medium">Avatar</div>
          <AvatarPicker avatars={avatars} value={selectedAvatar} onChange={setSelectedAvatar} />
        </div>
        <AgentForm
          model={selectedModelId || undefined}
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


