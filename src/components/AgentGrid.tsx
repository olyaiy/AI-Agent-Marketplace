import { AgentCard } from './AgentCard';

interface Agent {
  tag: string;
  name: string;
  avatar?: string | null;
  systemPrompt: string;
  tagline?: string | null;
  model: string;
  visibility?: 'public' | 'invite_only' | 'private';
  creatorId?: string | null;
}

interface AgentGridProps {
  agents: Agent[];
  currentUserId?: string | null;
}

export function AgentGrid({ agents, currentUserId }: AgentGridProps) {
  if (!agents.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No agents yet.</p>
        <p className="text-sm text-gray-400">Create your first agent to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-stretch">
      {agents.map((agent) => (
        <AgentCard
          key={agent.tag}
          tag={agent.tag}
          name={agent.name}
          avatar={agent.avatar}
          systemPrompt={agent.systemPrompt}
          tagline={agent.tagline}
          model={agent.model}
          visibility={agent.visibility}
          isOwner={Boolean(currentUserId && agent.creatorId && currentUserId === agent.creatorId)}
        />
      ))}
    </div>
  );
}
