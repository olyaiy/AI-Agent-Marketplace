'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Pencil } from 'lucide-react';
import { dispatchAgentNewChat } from '@/lib/agent-events';
import { Badge } from '@/components/ui/badge';

interface AgentInfoSidebarProps {
  name: string;
  avatarUrl?: string;
  tagline?: string | null;
  description?: string | null;
  variant?: 'sidebar' | 'sheet';
  agentTag?: string;
  canEdit?: boolean;
  modelOptions?: string[];
  activeModel?: string;
}

export default function AgentInfoSidebar({ name, avatarUrl, tagline, description, variant = 'sidebar', agentTag, canEdit, modelOptions, activeModel }: AgentInfoSidebarProps) {
  const effectiveTagline = (tagline && tagline.trim().length > 0) ? tagline : 'Your creative thinking partner';
  const effectiveDescription = (description && description.trim().length > 0)
    ? description
    : `Hi there! I'm ${name}, your friendly AI companion. I love helping with creative projects, brainstorming ideas, and turning thoughts into reality.`;
  
  // Extract agent ID from tag (remove @ prefix)
  const agentId = agentTag ? agentTag.replace('@', '') : null;
  const availableModels = Array.isArray(modelOptions) ? Array.from(new Set(modelOptions.filter(Boolean))) : [];

  return (
    <div className={cn(
      "w-full bg-white rounded-lg border border-gray-200 p-4 space-y-4",
      variant === 'sidebar' ? 'h-full flex flex-col' : '',
      'relative'
    )}>
      <div className="flex justify-end gap-2">
        {agentId && (
          <Button
            asChild
            variant="outline"
            size="sm"
            aria-label="New chat"
          >
            <Link
              href={`/agent/${agentId}`}
              prefetch={false}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
                  return;
                }
                event.preventDefault();
                dispatchAgentNewChat(agentTag);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Chat
            </Link>
          </Button>
        )}
        {canEdit && agentId ? (
          <Button
            asChild
            variant="outline"
            size="icon"
            aria-label="Edit agent"
          >
            <Link href={`/edit/${agentId}`}>
              <Pencil className="w-4 h-4" />
            </Link>
          </Button>
        ) : null}
      </div>
      {/* Header with Avatar and Info */}
      <div className="flex items-center gap-3">
        {/* Avatar on left */}
        {avatarUrl ? (
          <Image 
            src={avatarUrl} 
            alt="Agent Avatar" 
            width={64} 
            height={64}
            className="rounded-lg flex-shrink-0"
          />
        ) : null}
        
        {/* Name and tagline on right */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{name}</h2>
          <p className="text-sm text-gray-600 line-clamp-2 leading-tight mt-1">{effectiveTagline}</p>
        </div>
      </div>

      {/* Tag */}
      {agentTag && (
        <p className="text-xs text-gray-500 font-mono">
          {agentTag}
        </p>
      )}

      {availableModels.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Models</p>
          <div className="flex flex-wrap gap-2">
            {availableModels.map((m) => (
              <Badge key={m} variant={activeModel && activeModel === m ? 'default' : 'outline'} className="text-[11px]">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className={cn(
        "border-t border-gray-200 pt-4",
        variant === 'sidebar' ? 'flex-1 overflow-y-auto' : ''
      )}>
        <p className="text-sm text-gray-600 leading-relaxed">
          {effectiveDescription}
        </p>
      </div>

    </div>
  );
}
