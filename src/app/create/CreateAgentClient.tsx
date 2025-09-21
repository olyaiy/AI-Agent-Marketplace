"use client";

import * as React from "react";
import { ModelSelect } from "@/components/ModelSelect";
import type { ModelOption } from "@/components/ModelSelect";
import { AgentForm } from "./AgentForm";
import { AvatarPicker } from "@/components/avatar-picker";

interface Props {
  models: ModelOption[];
  avatars: string[];
}

export function CreateAgentClient({ models, avatars }: Props) {
  const [selectedCompositeId, setSelectedCompositeId] = React.useState<string | undefined>(undefined);
  const [selectedAvatar, setSelectedAvatar] = React.useState<string | undefined>(undefined);

  const selectedAgentModel = React.useMemo(() => {
    if (!selectedCompositeId) return undefined;
    const [provider, modelId] = selectedCompositeId.split(":");
    if (!provider || !modelId) return undefined;
    return `${provider}/${modelId}`;
  }, [selectedCompositeId]);

  const selectedAvatarFile = React.useMemo(() => {
    if (!selectedAvatar) return undefined;
    const parts = selectedAvatar.split("/");
    return parts[parts.length - 1] || undefined;
  }, [selectedAvatar]);

  return (
    <div>
      <div className="mb-4">
        <ModelSelect
          models={models}
          value={selectedCompositeId}
          onChange={setSelectedCompositeId}
          showLogos
        />
      </div>
      <div className="mb-4">
        <div className="mb-2 text-sm font-medium">Avatar</div>
        <AvatarPicker avatars={avatars} value={selectedAvatar} onChange={setSelectedAvatar} />
      </div>
      <AgentForm model={selectedAgentModel} avatar={selectedAvatarFile} />
    </div>
  );
}


