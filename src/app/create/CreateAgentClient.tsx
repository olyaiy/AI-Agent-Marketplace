"use client";

import * as React from "react";
import { ModelSelect } from "@/components/ModelSelect";
import type { ModelOption } from "@/components/ModelSelect";
import { AgentForm } from "./AgentForm";

interface Props {
  models: ModelOption[];
}

export function CreateAgentClient({ models }: Props) {
  const [selectedCompositeId, setSelectedCompositeId] = React.useState<string | undefined>(undefined);

  const selectedAgentModel = React.useMemo(() => {
    if (!selectedCompositeId) return undefined;
    const [provider, modelId] = selectedCompositeId.split(":");
    if (!provider || !modelId) return undefined;
    return `${provider}/${modelId}`;
  }, [selectedCompositeId]);

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
      <AgentForm model={selectedAgentModel} />
    </div>
  );
}


