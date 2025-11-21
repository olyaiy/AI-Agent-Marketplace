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
  secondaryModels?: string[];
  avatar?: string; // filename from /public/avatar
  onSystemPromptChange?: (systemPrompt: string) => void;
}

export function AgentForm({ model, secondaryModels, avatar, onSystemPromptChange }: AgentFormProps) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [isTagEdited, setIsTagEdited] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'invite_only' | 'private'>('public');
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
      secondaryModels,
      avatar,
      visibility,
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
            if (onSystemPromptChange) onSystemPromptChange(value);
          }}
          rows={8}
          className="border p-2"
        />
      </label>
      <div className="flex flex-col gap-2">
        <span className="font-medium text-sm">Visibility</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[
            { value: 'public', label: 'Public', hint: 'Listed on the homepage and searchable.' },
            { value: 'invite_only', label: 'Invite only', hint: 'Hidden from listings; share via link.' },
            { value: 'private', label: 'Private', hint: 'Only you can access it.' },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`flex flex-col gap-1 border rounded-md p-3 cursor-pointer transition-colors ${visibility === opt.value ? 'border-blue-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={() => setVisibility(opt.value as typeof visibility)}
                />
                <span className="font-semibold text-sm">{opt.label}</span>
              </div>
              <p className="text-xs text-gray-600">{opt.hint}</p>
            </label>
          ))}
        </div>
      </div>
      <button type="submit" className="border p-2">Create</button>
    </form>
  );
}
