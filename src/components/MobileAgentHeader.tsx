'use client';

import Image from 'next/image';
import { ChevronDownIcon } from 'lucide-react';

interface MobileAgentHeaderProps {
  name: string;
  avatarUrl?: string;
  tagline?: string | null;
  onClick?: () => void;
}

export function MobileAgentHeader({ name, avatarUrl, tagline, onClick }: MobileAgentHeaderProps) {
  const effectiveTagline = (tagline && tagline.trim().length > 0) ? tagline : 'Your AI assistant';

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 active:bg-gray-50 transition-colors"
      type="button"
    >
      {/* Avatar */}
      {avatarUrl ? (
        <Image 
          src={avatarUrl} 
          alt={name}
          width={40}
          height={40}
          className="rounded-lg flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0" />
      )}
      
      {/* Name and Tagline */}
      <div className="flex-1 text-left overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-900 truncate">{name}</h2>
        <p className="text-xs text-gray-600 truncate">{effectiveTagline}</p>
      </div>
      
      {/* Indicator */}
      <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </button>
  );
}

