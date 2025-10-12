'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MobileAgentHeader } from '@/components/MobileAgentHeader';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';

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
          <div className="bg-white border border-rose-200 px-5 py-5 rounded-xl">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              {avatarUrl ? (
                <Image 
                  src={avatarUrl} 
                  alt="Agent Avatar" 
                  width={72} 
                  height={72}
                  className="rounded-xl flex-shrink-0"
                />
              ) : null}
              
              {/* Name and tagline */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{name}</h2>
                <p className="text-sm text-gray-700 mt-0.5">{effectiveTagline}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4">
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-4">
              <p className="text-[13px] text-gray-600 leading-relaxed">
                {effectiveDescription}
              </p>
            </div>
          </div>

          {/* New Chat Button */}
          {agentId && (
            <div className="mt-4">
              <Button 
                asChild 
                variant="outline"
                className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300"
              >
                <Link href={`/agent/${agentId}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

