"use client";

import * as React from "react";
import { OpenRouterModelSelect } from "@/components/OpenRouterModelSelect";
import { KnowledgeManager } from "./KnowledgeManager";
import { SecondaryModelsInput } from "@/components/SecondaryModelsInput";

interface Props {
  agentTag: string;
  initialModel: string | undefined;
  initialSecondaryModels?: string[];
  initialSystemPrompt?: string;
  initialTagline?: string;
  initialDescription?: string;
  onChange?: (model: string | undefined) => void;
  onContextChange?: (update: { model?: string; systemPrompt?: string; tagline?: string; description?: string }) => void;
  onTabChange?: (tab: "behaviour" | "details" | "knowledge") => void;
  onSecondaryModelsChange?: (models: string[]) => void;
}

export const EditAgentClient = React.memo(function EditAgentClient({ agentTag, initialModel, initialSecondaryModels = [], initialSystemPrompt, initialTagline, initialDescription, onChange, onContextChange, onTabChange, onSecondaryModelsChange }: Props) {
  const [selectedModel, setSelectedModel] = React.useState<string>(initialModel || "");
  const [secondaryModels, setSecondaryModels] = React.useState<string[]>(initialSecondaryModels || []);
  const [activeTab, setActiveTab] = React.useState<"behaviour" | "details" | "knowledge">("behaviour");

  React.useEffect(() => {
    if (onChange) onChange(selectedModel || undefined);
    if (onContextChange) onContextChange({ model: selectedModel || undefined });
  }, [selectedModel, onChange, onContextChange]);

  React.useEffect(() => {
    if (onTabChange) onTabChange(activeTab);
  }, [activeTab, onTabChange]);

  React.useEffect(() => {
    if (onSecondaryModelsChange) onSecondaryModelsChange(secondaryModels);
  }, [secondaryModels, onSecondaryModelsChange]);

  return (
    <div className="space-y-4">
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
        <button
          type="button"
          className={`px-3 py-2 text-sm ${activeTab === 'knowledge' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab("knowledge")}
        >
          Knowledge Base
        </button>
      </div>

      {/* Tabs content */}
      <div className="pt-4">
        {activeTab === "behaviour" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <OpenRouterModelSelect
                value={selectedModel}
                onChange={(value) => setSelectedModel(value)}
                placeholder="Select a model..."
                width="100%"
                label="Primary model"
              />
              <SecondaryModelsInput value={secondaryModels} onChange={setSecondaryModels} includeHiddenInput={false} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900">System Prompt</label>
              <p className="text-sm text-gray-500">
                Define how your agent behaves and responds. This sets the personality, tone, and expertise of your agent.
              </p>
              <textarea
                name="systemPrompt"
                defaultValue={initialSystemPrompt}
                onInput={(e) => onContextChange && onContextChange({ systemPrompt: e.currentTarget.value })}
                rows={8}
                placeholder="e.g., You are a helpful assistant specialized in..."
                className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-none text-sm"
              />
            </div>
          </div>
        ) : activeTab === "details" ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900">Tagline</label>
              <p className="text-sm text-gray-500">
                A short, catchy phrase that describes your agent in a few words.
              </p>
              <input
                name="tagline"
                defaultValue={initialTagline}
                onInput={(e) => onContextChange && onContextChange({ tagline: e.currentTarget.value })}
                placeholder="e.g., Your personal coding assistant"
                className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-900">Description</label>
              <p className="text-sm text-gray-500">
                Provide a detailed description of what your agent does and how it can help users.
              </p>
              <textarea
                name="description"
                defaultValue={initialDescription}
                onInput={(e) => onContextChange && onContextChange({ description: e.currentTarget.value })}
                rows={6}
                placeholder="Describe your agent's capabilities, use cases, and what makes it special..."
                className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all resize-none text-sm"
              />
            </div>
          </div>
        ) : (
          <KnowledgeManager agentTag={agentTag} />
        )}
      </div>
      <input type="hidden" name="model" value={selectedModel || ""} />
      <input type="hidden" name="secondaryModels" value={JSON.stringify(secondaryModels || [])} />
    </div>
  );
});
