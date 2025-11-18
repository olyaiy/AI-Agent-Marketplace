'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MobileAgentHeader } from '@/components/MobileAgentHeader';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { dispatchAgentNewChat } from '@/lib/agent-events';

interface AgentInfoSheetProps {
  name: string;
  avatarUrl?: string;
  tagline?: string | null;
  description?: string | null;
  agentTag?: string;
}

export function AgentInfoSheet({ name, avatarUrl, tagline, description, agentTag }: AgentInfoSheetProps) {
  const [open, setOpen] = useState(false);
  
  const effectiveTagline = (tagline && tagline.trim().length > 0) ? tagline : 'Your creative thinking partner';
  const effectiveDescription = (description && description.trim().length > 0)
    ? description
    : `Hi there! I'm ${name}, your friendly AI companion. I love helping with creative projects, brainstorming ideas, and turning thoughts into reality.`;
  
  // Extract agent ID from tag (remove @ prefix)
  const agentId = agentTag ? agentTag.replace('@', '') : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <MobileAgentHeader
        name={name}
        avatarUrl={avatarUrl}
        tagline={tagline}
        onClick={() => setOpen(true)}
      />
      
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>About this agent</SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 overflow-y-auto h-full pb-20">
          {/* Agent Info Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            {/* Header with Avatar and Info */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {avatarUrl ? (
                <Image 
                  src={avatarUrl} 
                  alt="Agent Avatar" 
                  width={64} 
                  height={64}
                  className="rounded-lg flex-shrink-0"
                />
              ) : null}
              
              {/* Name and tagline */}
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

            {/* Description */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {effectiveDescription}
              </p>
            </div>

            {/* New Chat Button */}
            {agentId && (
              <div className="border-t border-gray-200 pt-4">
                <Button 
                  asChild 
                  variant="outline"
                  className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
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
                      setOpen(false);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
