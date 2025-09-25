// src/app/page.tsx
// Main home page component for the AI Agents application
// This is the root page that displays a list of all available AI agents

import { listAgents } from '@/actions/agents';
import { AgentGrid } from '@/components/AgentGrid';
import { HeroCards } from '@/components/HeroCards';
import { AgentSearch } from '@/components/AgentSearch';
import { FilterBadges } from '@/components/FilterBadges';

/**
 * Home page component that serves as the main entry point for the application
 * Displays a header with title and search bar, followed by the agents list
 * This is a server component that renders the AgentsList server component
 */
export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    // Main container with minimum full screen height and horizontal padding
    <main className="min-h-screen  px-4">
      {/* Content wrapper with max-width and vertical spacing */}
      <div className="mx-auto max-w-5xl py-8">
        {/* Header section with title and search bar */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            {/* Main page title */}
            <h1 className="text-3xl font-semibold text-gray-900">Agents</h1>
            {/* Subtitle describing the page purpose */}
            <p className="text-gray-600 mt-1">Discover and create your AI agents</p>
          </div>
          {/* Search bar */}
          <AgentSearch className="w-80" />
        </div>
        
        {/* Filter Badges Section */}
        <FilterBadges />
        
        {/* Hero Cards Section */}
        <HeroCards />
        
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
