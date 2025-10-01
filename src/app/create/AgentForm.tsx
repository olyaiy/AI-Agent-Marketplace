"use client";

import { useEffect, useMemo, useState } from 'react';
import { createAgent } from '@/actions/agents';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface AgentFormProps {
  model?: string;
  avatar?: string; // filename from /public/avatar
  onSystemPromptChange?: (systemPrompt: string) => void;
}

export function AgentForm({ model, avatar, onSystemPromptChange }: AgentFormProps) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [isTagEdited, setIsTagEdited] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const derivedTag = useMemo(() => (name ? `@${slugify(name)}` : ''), [name]);

  useEffect(() => {
    if (!isTagEdited) setTag(derivedTag);
  }, [derivedTag, isTagEdited]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTag = tag.startsWith('@') ? tag : `@${tag}`;
    const normalizedTag = cleanTag.replace(/\s+/g, '').toLowerCase();
    const res = await createAgent({
      tag: normalizedTag,
      name: name.trim(),
      systemPrompt: systemPrompt.trim(),
      model,
      avatar,
    });
    if (res?.ok) {
      // rely on server redirect pattern in RSC layer
      window.location.assign(`/agent/${encodeURIComponent(normalizedTag.slice(1))}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span>Agent name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Luna" className="border p-2" />
      </label>
      <label className="flex flex-col gap-1">
        <span>Tag</span>
        <input
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            setIsTagEdited(true);
          }}
          onFocus={() => setIsTagEdited(true)}
          placeholder="@luna"
          className="border p-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>System prompt</span>
        <textarea
          value={systemPrompt}
          onChange={(e) => {
            const value = e.target.value;
            setSystemPrompt(value);
            onSystemPromptChange && onSystemPromptChange(value);
          }}
          rows={8}
          className="border p-2"
        />
      </label>
      <button type="submit" className="border p-2">Create</button>
    </form>
  );
}
