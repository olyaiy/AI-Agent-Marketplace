import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Agent {
  tag: string;
  name: string;
  avatar?: string | null;
  systemPrompt: string;
  tagline?: string | null;
}

interface YourAgentsCarouselProps {
  agents: Agent[];
}

export function YourAgentsCarousel({ agents }: YourAgentsCarouselProps) {
  if (!agents.length) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <Badge variant="secondary" className="text-sm font-medium">
          Your Agents
        </Badge>
        <Link 
          href="/create" 
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Create New
        </Link>
      </div>
      
      {/* Horizontally scrollable container */}
      <div className="overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex gap-4 pb-2" style={{ minWidth: 'min-content' }}>
          {agents.map((agent) => (
            <AgentCardSmall
              key={agent.tag}
              tag={agent.tag}
              name={agent.name}
              avatar={agent.avatar}
              tagline={agent.tagline}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface AgentCardSmallProps {
  tag: string;
  name: string;
  avatar?: string | null;
  tagline?: string | null;
}

function AgentCardSmall({ tag, name, avatar, tagline }: AgentCardSmallProps) {
  const agentId = encodeURIComponent(tag.replace(/^@/, ''));

  return (
    <div className="relative group flex-shrink-0" style={{ width: '220px' }}>
      <Card className="h-36 overflow-hidden hover:shadow-md transition-all duration-200 hover:border-gray-900 bg-white p-3 relative">
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {name}
            </h3>
            {tagline && (
              <p className="text-xs text-gray-600 line-clamp-2 leading-tight">
                {tagline}
              </p>
            )}
          </div>
          <div className="mt-auto">
            <p className="text-xs text-gray-500 font-mono truncate">
              {tag}
            </p>
          </div>
        </div>
        
        {avatar && (
          <Image
            src={`/avatars/${avatar}`}
            alt={`${name} avatar`}
            width={60}
            height={60}
            className="absolute bottom-0 right-0 rounded-lg scale-x-[-1] -mr-0 -mb-1 group-hover:scale-y-105 group-hover:-scale-x-105 transition-transform duration-200"
            quality={90}
          />
        )}
      </Card>

      {/* Full-card clickable overlay */}
      <Link href={`/agent/${agentId}`} className="absolute inset-0" aria-label={`Open ${name}`}>
        <span className="sr-only">Open {name}</span>
      </Link>

      {/* Edit button in top right */}
      <Link 
        href={`/edit/${agentId}`}
        className="absolute top-2 right-2 z-10 p-1.5 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </Link>
    </div>
  );
}

