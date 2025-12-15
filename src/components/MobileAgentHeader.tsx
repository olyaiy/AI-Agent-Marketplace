'use client';

import Image from 'next/image';
import { ChevronDownIcon, PanelLeftIcon } from 'lucide-react';

interface MobileAgentHeaderProps {
  name: string;
  avatarUrl?: string;
  tagline?: string | null;
  onAgentClick?: () => void;
  onMenuClick?: () => void;
}

export function MobileAgentHeader({ name, avatarUrl, tagline, onAgentClick, onMenuClick }: MobileAgentHeaderProps) {
  const effectiveTagline = (tagline && tagline.trim().length > 0) ? tagline : 'Your AI assistant';

  return (
    <div className="w-full flex items-stretch">
      {/* Left Zone - Menu Button */}
      <button
        onClick={onMenuClick}
        className="flex-shrink-0 w-12 flex items-center justify-center py-2 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-l-lg"
        type="button"
        aria-label="Open sidebar menu"
      >
        <PanelLeftIcon className="w-5 h-5 text-gray-600" />
      </button>

      {/* Divider */}
      <div className="w-px bg-gray-200 my-2" />

      {/* Right Zone - Agent Info */}
      <button
        onClick={onAgentClick}
        className="flex-1 flex items-center gap-3 px-3 py-2 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-r-lg"
        type="button"
        aria-label="View agent details"
      >
        {/* Avatar */}
        {avatarUrl ? (
          <Image 
            src={avatarUrl} 
            alt={name}
            width={36}
            height={36}
            className="rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-gray-200 flex-shrink-0" />
        )}
        
        {/* Name and Tagline */}
        <div className="flex-1 text-left overflow-hidden min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">{name}</h2>
          <p className="text-xs text-gray-600 truncate">{effectiveTagline}</p>
        </div>
        
        {/* Indicator */}
        <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
    </div>
  );
}

