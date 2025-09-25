"use client";

import * as React from "react";
import { ModelSelect } from "@/components/ModelSelect";
import type { ModelOption } from "@/components/ModelSelect";

interface Props {
  models: ModelOption[];
  initialModel: string | undefined;
  initialSystemPrompt?: string;
  initialTagline?: string;
  initialDescription?: string;
  onChange?: (model: string | undefined) => void;
  onContextChange?: (update: { model?: string; systemPrompt?: string; tagline?: string; description?: string }) => void;
}

export const EditAgentClient = React.memo(function EditAgentClient({ models, initialModel, initialSystemPrompt, initialTagline, initialDescription, onChange, onContextChange }: Props) {
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
  const [activeTab, setActiveTab] = React.useState<"behaviour" | "details">("behaviour");

  const persistedModel = React.useMemo(() => {
    if (!composite) return initialModel;
    const [provider, modelId] = composite.split(":");
    if (!provider || !modelId) return initialModel;
    return `${provider}/${modelId}`;
  }, [composite, initialModel]);

  React.useEffect(() => {
    if (onChange) onChange(persistedModel || undefined);
    if (onContextChange) onContextChange({ model: persistedModel || undefined });
  }, [persistedModel, onChange, onContextChange]);

  return (
    <div className="space-y-4">
      {/* Model selector */}
      <div className="space-y-2">
        <label className="block text-sm text-muted-foreground">Model</label>
        <ModelSelect models={models} value={composite} onChange={setComposite} showLogos />
        <input type="hidden" name="model" value={persistedModel || ""} />
      </div>

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
      </div>

      {/* Tabs content */}
      <div className="pt-1 space-y-3">
        {activeTab === "behaviour" ? (
          <label className="flex flex-col gap-1">
            <span>System prompt</span>
            <textarea
              name="systemPrompt"
              defaultValue={initialSystemPrompt}
              onInput={(e) => onContextChange && onContextChange({ systemPrompt: e.currentTarget.value })}
              rows={8}
              className="border p-2"
            />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span>Tagline</span>
              <input
                name="tagline"
                defaultValue={initialTagline}
                onInput={(e) => onContextChange && onContextChange({ tagline: e.currentTarget.value })}
                className="border p-2"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Description</span>
              <textarea
                name="description"
                defaultValue={initialDescription}
                onInput={(e) => onContextChange && onContextChange({ description: e.currentTarget.value })}
                rows={6}
                className="border p-2"
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
});


