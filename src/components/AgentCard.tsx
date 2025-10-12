import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';

interface AgentCardProps {
  tag: string;
  name: string;
  avatar?: string | null;
  systemPrompt: string;
  tagline?: string | null;
}

export function AgentCard({ tag, name, avatar, systemPrompt, tagline }: AgentCardProps) {
  const agentId = encodeURIComponent(tag.replace(/^@/, ''));

  return (
    <div className="relative group h-full overflow-hidden border-black">
      <Card className="h-64 md:h-44 overflow-hidden hover:shadow-md transition-all duration-200 border-grey-200   hover:border-gray-900 bg-white p-4 relative">
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="font-semibold text-gray-900 text-base truncate">
              {name}
            </h3>
            {tagline && (
              <p className="text-sm text-gray-600 line-clamp-2 leading-tight">
                {tagline}
              </p>
            )}
          </div>
          <div className="mt-auto text-center md:text-left">
            <p className="text-xs text-gray-500 font-mono">
              {tag}
            </p>
          </div>
        </div>
        
        {avatar && (
          <Image
            src={`/avatars/${avatar}`}
            alt={`${name} avatar`}
            width={90}
            height={90}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 rounded-lg scale-x-[-1] -mr-0 -mb-2 group-hover:scale-y-110  group-hover:-scale-x-110 group-hover:scale-y-110 transition-transform duration-200"
            quality={90}
          />
        )}
      </Card>

      {/* Full-card clickable overlay */}
      <Link href={`/agent/${agentId}`} className="absolute inset-0" aria-label={`Open ${name}`}>
        <span className="sr-only">Open {name}</span>
      </Link>

      {/* Subtle edit button in top right */}
      <Link 
        href={`/edit/${agentId}`}
        className="absolute top-2 right-2 z-10 p-2 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </Link>
    </div>
  );
}
