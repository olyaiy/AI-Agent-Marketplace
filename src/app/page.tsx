// src/app/page.tsx
// Main home page component for the AI Agents application
// This is the root page that displays a list of all available AI agents

import { headers } from 'next/headers';
import { listAgents, getAgentsByCreator } from '@/actions/agents';
import { AgentGrid } from '@/components/AgentGrid';
import { HeroCards } from '@/components/HeroCards';
import { AgentSearch } from '@/components/AgentSearch';
import { FilterBadges } from '@/components/FilterBadges';
import { YourAgentsCarousel } from '@/components/YourAgentsCarousel';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/auth';

/**
 * Home page component that serves as the main entry point for the application
 * Displays a header with title and search bar, followed by the agents list
 * This is a server component that renders the AgentsList server component
 */
export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  
  // Get current user session
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  const userId = session?.user?.id;
  
  // Fetch user's agents if logged in
  const yourAgents = userId ? await getAgentsByCreator(userId) : [];
  
  return (
    // Main container with minimum full screen height and horizontal padding
    <main className="min-h-screen px-4 sm:px-2 md:px-4">
      {/* Content wrapper with max-width and vertical spacing */}
      <div className="mx-auto max-w-5xl py-8">
        {/* Header section with title and search bar */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            {/* Main page title - hidden on mobile */}
            <h1 className="hidden md:block text-3xl font-semibold text-gray-900">Agents</h1>
            {/* Subtitle describing the page purpose */}
            <p className="text-gray-600">Discover and create your AI agents</p>
          </div>
          {/* Search bar - full width on mobile, fixed width on desktop */}
          <AgentSearch className="w-full md:w-80" />
        </div>
        
        {/* Filter Badges Section */}
        <FilterBadges />
        
        {/* Hero Cards Section */}
        <HeroCards />
        
        {/* Your Agents Carousel - only show if user has agents */}
        <YourAgentsCarousel agents={yourAgents} />
        
        {/* Featured Agents Section */}
        <div className="mb-4">
          <Badge variant="secondary" className="text-sm font-medium">
            Featured Agents
          </Badge>
        </div>
        
        {/* Server Component: fetch and render agents */}
        {/* This component handles data fetching on the server side */}
        <AgentsList query={q} />
      </div>
    </main>
  );
}

/**
 * Server component responsible for fetching and displaying the list of agents
 * This component runs on the server and handles the async data fetching
 * It calls the listAgents action to get all agents from the database
 * and passes them to the AgentGrid component for rendering
 */
interface AgentsListProps { query?: string }

async function AgentsList({ query }: AgentsListProps) {
  // Fetch filtered agents on the server using the query
  const agents = await listAgents(query);
  
  // Render the AgentGrid component with the fetched agents
  return <AgentGrid agents={agents} />;
}
