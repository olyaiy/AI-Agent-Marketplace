import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { deriveProviderSlug, getDisplayName } from '@/lib/model-display';
import { ProviderAvatar } from '@/components/ProviderAvatar';

interface AgentCardProps {
  tag: string;
  name: string;
  avatar?: string | null;
  systemPrompt: string;
  tagline?: string | null;
  model: string;
  visibility?: 'public' | 'invite_only' | 'private';
  isOwner?: boolean;
}

export function AgentCard({ tag, name, avatar, tagline, model, visibility, isOwner }: AgentCardProps) {
  const agentId = encodeURIComponent(tag.replace(/^@/, ''));
  const displayLabel = useMemo(() => getDisplayName(undefined, model), [model]);
  const providerSlug = useMemo(() => deriveProviderSlug(null, model), [model]);

  return (
    <div className="relative group h-full overflow-hidden border-black">
      <Card className="h-36 md:h-44 overflow-hidden hover:shadow-md transition-all duration-200 border-grey-200 hover:border-gray-900 bg-white p-3 md:p-4 relative">
        <div className="flex flex-col h-full justify-between pr-16 md:pr-20">
          <div className="space-y-1 md:space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm md:text-base ">
              {name}
            </h3>
            {visibility && visibility !== 'public' && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 uppercase tracking-wide text-[10px]">
                {visibility === 'invite_only' ? 'Invite only' : 'Private'}
              </span>
            )}
            {tagline && (
              <p className="text-xs md:text-sm text-gray-600 line-clamp-2 leading-tight">
                {tagline}
              </p>
            )}
          </div>
          <div className="mt-auto">
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-gray-600 truncate">
              <ProviderAvatar providerSlug={providerSlug} size={18} />
              <span className="truncate">{displayLabel}</span>
            </div>
          </div>
        </div>
        
        {avatar && (
          <Image
            src={`/avatars/${avatar}`}
            alt={`${name} avatar`}
            width={90}
            height={90}
            className="absolute bottom-0 right-0 size-24 md:size-30 rounded-lg scale-x-[-1] -mr-0 -mb-2 group-hover:scale-y-110 group-hover:-scale-x-110 transition-transform duration-200 object-contain"
            quality={90}
          />
        )}
      </Card>

      {/* Full-card clickable overlay */}
      <Link href={`/agent/${agentId}`} className="absolute inset-0" aria-label={`Open ${name}`}>
        <span className="sr-only">Open {name}</span>
      </Link>

      {/* Subtle edit button in top right - only shown to owner */}
      {isOwner && (
        <Link
          href={`/edit/${agentId}`}
          className="absolute top-2 right-2 z-10 p-2 text-gray-400 hover:text-gray-600 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </Link>
      )}
    </div>
  );
}
