"use client";

import * as React from "react";
import { OpenRouterModelSelect } from "@/components/OpenRouterModelSelect";

interface Props {
  initialModel: string | undefined;
  initialSystemPrompt?: string;
  initialTagline?: string;
  initialDescription?: string;
  onChange?: (model: string | undefined) => void;
  onContextChange?: (update: { model?: string; systemPrompt?: string; tagline?: string; description?: string }) => void;
}

export const EditAgentClient = React.memo(function EditAgentClient({ initialModel, initialSystemPrompt, initialTagline, initialDescription, onChange, onContextChange }: Props) {
  const [selectedModel, setSelectedModel] = React.useState<string>(initialModel || "");
  const [activeTab, setActiveTab] = React.useState<"behaviour" | "details">("behaviour");

  React.useEffect(() => {
    if (onChange) onChange(selectedModel || undefined);
    if (onContextChange) onContextChange({ model: selectedModel || undefined });
  }, [selectedModel, onChange, onContextChange]);

  return (
    <div className="space-y-4">
      {/* Model selector */}
      <div className="space-y-2">
        <OpenRouterModelSelect
          value={selectedModel}
          onChange={(value) => setSelectedModel(value)}
          placeholder="Select a model..."
          width="100%"
          label="Model"
        />
        <input type="hidden" name="model" value={selectedModel || ""} />
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


