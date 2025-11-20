"use client";

import * as React from "react";
import { OpenRouterModelSelect } from "./OpenRouterModelSelect";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function SecondaryModelsInput({ value, onChange, label = "Secondary models", placeholder = "Search models to add..." }: Props) {
  const [pending, setPending] = React.useState<string>("");

  const addPending = React.useCallback(
    (modelId?: string) => {
      const trimmed = typeof modelId === "string" ? modelId.trim() : "";
      if (!trimmed) return;
      if (value.includes(trimmed)) {
        setPending("");
        return;
      }
      const next = [...value, trimmed];
      onChange(next.slice(0, 16));
      setPending("");
    },
    [onChange, value]
  );

  const removeModel = React.useCallback(
    (modelId: string) => {
      const next = value.filter((m) => m !== modelId);
      onChange(next);
    },
    [onChange, value]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <span className="text-xs text-gray-500">Optional</span>
      </div>
      <OpenRouterModelSelect
        value={pending}
        onChange={(val) => {
          setPending(val);
          // If user re-selects a pending value, treat it as add
          addPending(val);
        }}
        placeholder={placeholder}
        width="100%"
        label=""
      />
      <div className="flex flex-wrap gap-2">
        {value.length === 0 ? (
          <span className="text-xs text-gray-500">No secondary models added.</span>
        ) : (
          value.map((modelId) => (
            <Badge key={modelId} variant="outline" className="flex items-center gap-1 text-xs">
              <span className="max-w-[260px] truncate">{modelId}</span>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded p-0.5 hover:bg-gray-100"
                onClick={() => removeModel(modelId)}
                aria-label={`Remove ${modelId}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      {pending && (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => addPending(pending)}>
            Add model
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setPending("")}>
            Clear
          </Button>
        </div>
      )}
      <input type="hidden" name="secondaryModels" value={JSON.stringify(value)} />
    </div>
  );
}
