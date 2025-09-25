"use client";

import * as React from "react";
import Chat from "@/components/Chat";
import { EditAgentClient } from "./EditAgentClient";
import { EditAvatarClient } from "./EditAvatarClient";
import type { ModelOption } from "@/components/ModelSelect";
import { LiveEditProvider, useLiveEdit } from "./LiveEditProvider";

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
  models: ModelOption[];
  avatars: string[];
  onSave: ServerAction;
  onDelete: ServerAction;
}

function LeftForm({
  id,
  tag,
  initialName,
  initialSystemPrompt,
  initialModel,
  initialAvatar,
  models,
  avatars,
  onSave,
  onDelete,
}: Props) {
  const { model, systemPrompt, setModel, setSystemPrompt } = useLiveEdit();
  const [systemPromptDraft, setSystemPromptDraft] = React.useState<string>(initialSystemPrompt || "");

  React.useEffect(() => {
    // initialize context on mount
    if (initialModel && !model) setModel(initialModel);
    if (initialSystemPrompt && !systemPrompt) setSystemPrompt(initialSystemPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep local draft in sync if context changes externally (e.g., initial load)
  React.useEffect(() => {
    // only update draft if it differs to avoid cursor jumps
    if ((systemPrompt || "") !== systemPromptDraft) {
      setSystemPromptDraft(systemPrompt || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemPrompt]);

  // debounce pushing draft to context so Chat doesn't re-render on every keystroke
  React.useEffect(() => {
    const id = setTimeout(() => setSystemPrompt(systemPromptDraft), 300);
    return () => clearTimeout(id);
  }, [systemPromptDraft, setSystemPrompt]);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl mb-4">Edit Agent</h1>
      <form action={onSave} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={id} />

        <div>
          <label className="block mb-2">Avatar</label>
          <EditAvatarClient avatars={avatars} initialAvatar={initialAvatar} />
        </div>

        <div>
          <label className="block mb-2">Model</label>
          <EditAgentClient models={models} initialModel={initialModel} onChange={setModel} />
        </div>

        <label className="flex flex-col gap-1">
          <span>Agent name</span>
          <input name="name" defaultValue={initialName} className="border p-2" />
        </label>

        <label className="flex flex-col gap-1">
          <span>Tag</span>
          <input disabled value={tag} className="border p-2 bg-gray-50" />
        </label>

        <label className="flex flex-col gap-1">
          <span>System prompt</span>
          <textarea
            name="systemPrompt"
            value={systemPromptDraft}
            onChange={(e) => setSystemPromptDraft(e.target.value)}
            rows={8}
            className="border p-2"
          />
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" className="border p-2">Save</button>
          <button formAction={onDelete} className="border p-2">Delete</button>
        </div>
      </form>
    </div>
  );
}

export default function EditAgentTwoColumnClient(props: Props) {
  return (
    <LiveEditProvider initialModel={props.initialModel} initialSystemPrompt={props.initialSystemPrompt}>
      <TwoColumn {...props} />
    </LiveEditProvider>
  );
}

function TwoColumn(props: Props) {
  const { model, systemPrompt } = useLiveEdit();
  return (
    <div className="mx-auto p-6 h-full grid grid-cols-1 gap-6 lg:grid-cols-2 max-w-6xl">
      <LeftForm {...props} />
      <div className="min-h-[60vh] h-full border rounded-md p-2">
        <Chat className="h-full" systemPrompt={systemPrompt} model={model} />
      </div>
    </div>
  );
}


