export interface HomeRowAgent {
  tag: string;
  name: string;
  avatar?: string | null;
  tagline?: string | null;
  model: string;
  systemPrompt: string;
  visibility?: 'public' | 'invite_only' | 'private';
}

export interface HomeRowWithAgents {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  sortOrder: number;
  maxItems: number | null;
  agents: HomeRowAgent[];
}
