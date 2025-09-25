"use client";

import * as React from "react";
import { ModelSelect } from "@/components/ModelSelect";
import type { ModelOption } from "@/components/ModelSelect";

interface Props {
  models: ModelOption[];
  initialModel: string | undefined;
  onChange?: (model: string | undefined) => void;
}

export const EditAgentClient = React.memo(function EditAgentClient({ models, initialModel, onChange }: Props) {
  // incoming model may be provider/model-id, convert to provider:model-id for ModelSelect value
  const initialComposite = React.useMemo(() => {
    if (!initialModel) return undefined;
    const normalized = initialModel.replace(":", "/");
    const slash = normalized.indexOf("/");
    if (slash <= 0 || slash === normalized.length - 1) return undefined;
    const provider = normalized.slice(0, slash);
    const modelId = normalized.slice(slash + 1);
    return `${provider}:${modelId}`;
  }, [initialModel]);

  const [composite, setComposite] = React.useState<string | undefined>(initialComposite);

  const persistedModel = React.useMemo(() => {
    if (!composite) return initialModel;
    const [provider, modelId] = composite.split(":");
    if (!provider || !modelId) return initialModel;
    return `${provider}/${modelId}`;
  }, [composite, initialModel]);

  React.useEffect(() => {
    if (onChange) onChange(persistedModel || undefined);
  }, [persistedModel, onChange]);

  return (
    <div className="space-y-2">
      <ModelSelect models={models} value={composite} onChange={setComposite} showLogos />
      <input type="hidden" name="model" value={persistedModel || ""} />
    </div>
  );
});


