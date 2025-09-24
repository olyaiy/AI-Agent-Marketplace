// src/app/page.tsx
// Main home page component for the AI Agents application
// This is the root page that displays a list of all available AI agents

import Link from 'next/link';
import { listAgents } from '@/actions/agents';
import { AgentGrid } from '@/components/AgentGrid';
import { HeroCards } from '@/components/HeroCards';

/**
 * Home page component that serves as the main entry point for the application
 * Displays a header with title and "Create Agent" button, followed by the agents list
 * This is a server component that renders the AgentsList server component
 */
export default function Home() {
  return (
    // Main container with minimum full screen height and horizontal padding
    <main className="min-h-screen  px-4">
      {/* Content wrapper with max-width and vertical spacing */}
      <div className="mx-auto max-w-5xl py-8">
        {/* Header section with title and create button */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            {/* Main page title */}
            <h1 className="text-3xl font-semibold text-gray-900">Agents</h1>
            {/* Subtitle describing the page purpose */}
            <p className="text-gray-600 mt-1">Discover and manage your AI agents</p>
          </div>
          {/* Navigation link to create new agent page */}
          <Link 
            href="/create" 
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
          >
            Create Agent
          </Link>
        </div>
        
        {/* Hero Cards Section */}
        <HeroCards />
        
        {/* Server Component: fetch and render agents */}
        {/* This component handles data fetching on the server side */}
        <AgentsList />
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
async function AgentsList() {
  // Fetch all agents from the database using the server action
  const agents = await listAgents();
  
  // Render the AgentGrid component with the fetched agents
  return <AgentGrid agents={agents} />;
}
