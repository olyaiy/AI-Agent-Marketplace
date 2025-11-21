// src/app/page.tsx
// Main home page component for the AI Agents application
// This is the root page that displays a list of all available AI agents

import Link from 'next/link';
import { headers } from 'next/headers';
import { getAgentsByCreator } from '@/actions/agents';
import { listAgentsPaginated, listHomeRows } from '@/actions/homeRows';
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
export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams?.q === 'string' ? resolvedSearchParams.q : undefined;
  const pageParam =
    typeof resolvedSearchParams?.page === 'string' ? Number(resolvedSearchParams.page) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  
  // Get current user session
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);
  const userId = session?.user?.id;
  
  // Fetch user's agents if logged in
  const yourAgentsRaw = userId ? await getAgentsByCreator(userId) : [];
  const yourAgents = yourAgentsRaw.map((agent) => {
    const visibility: 'public' | 'invite_only' | 'private' =
      agent.visibility === 'invite_only' || agent.visibility === 'private' ? agent.visibility : 'public';
    return { ...agent, visibility };
  });

  // Load curated rows (published only)
  const curatedRows = await listHomeRows({ includeUnpublished: false });
  const curatedTags = q ? [] : curatedRows.flatMap((row) => row.agents.map((agent) => agent.tag));

  // Paginated list for remaining agents
  const paginated = await listAgentsPaginated({
    query: q,
    page,
    pageSize: 12,
    excludeTags: curatedTags,
  });
  
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
        
        {/* Curated rows configured by admin */}
        <CuratedRows rows={curatedRows} />

        {/* Paginated list of the remaining agents */}
        <PaginatedAgentsList
          query={q}
          page={paginated.page}
          pageSize={paginated.pageSize}
          total={paginated.total}
          agents={paginated.agents}
        />
      </div>
    </main>
  );
}

/**
 * Render curated rows configured by admins
 */
function CuratedRows({ rows }: { rows: Awaited<ReturnType<typeof listHomeRows>> }) {
  const visibleRows = rows.filter((row) => row.isPublished && row.agents.length > 0);
  if (!visibleRows.length) return null;

  return (
    <div className="space-y-8">
      {visibleRows.map((row) => (
        <section key={row.id} className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm font-medium">
                {row.title}
              </Badge>
              {typeof row.maxItems === 'number' && (
                <span className="text-xs text-gray-500">
                  Showing up to {row.maxItems} agents
                </span>
              )}
            </div>
            {row.description && (
              <p className="text-sm text-gray-600 mt-1">{row.description}</p>
            )}
          </div>
          <AgentGrid agents={row.agents} />
        </section>
      ))}
    </div>
  );
}

/**
 * Server component responsible for rendering paginated agents list
 */
function PaginatedAgentsList({
  agents,
  total,
  page,
  pageSize,
  query,
}: {
  agents: Awaited<ReturnType<typeof listAgentsPaginated>>['agents'];
  total: number;
  page: number;
  pageSize: number;
  query?: string;
}) {
  const normalizedAgents = agents.map((agent) => {
    const visibility: 'public' | 'invite_only' | 'private' =
      agent.visibility === 'invite_only' || agent.visibility === 'private' ? agent.visibility : 'public';
    return { ...agent, visibility };
  });
  const totalPages = Math.ceil(total / pageSize);
  const hasResults = normalizedAgents.length > 0;

  return (
    <section className="space-y-4 mt-10">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-sm font-medium">
          More Agents
        </Badge>
        <p className="text-xs text-gray-500">
          {hasResults ? `Page ${page} of ${Math.max(totalPages, 1)}` : 'No agents found'}
        </p>
      </div>
      <AgentGrid agents={normalizedAgents} />
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} query={query} />
    </section>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  query,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  query?: string;
}) {
  if (totalPages <= 1) return null;

  const createHref = (pageValue: number) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (pageValue > 1) params.set('page', String(pageValue));
    const search = params.toString();
    return search ? `/?${search}` : '/';
  };

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-2">
      <Link
        href={createHref(prevPage)}
        aria-disabled={page === 1}
        className={`text-sm font-medium ${page === 1 ? 'text-gray-400 pointer-events-none' : 'text-blue-600 hover:text-blue-700'}`}
      >
        Previous
      </Link>
      <div className="text-xs text-gray-500">
        Showing {start} - {end} of {total}
      </div>
      <Link
        href={createHref(nextPage)}
        aria-disabled={page === totalPages}
        className={`text-sm font-medium ${page === totalPages ? 'text-gray-400 pointer-events-none' : 'text-blue-600 hover:text-blue-700'}`}
      >
        Next
      </Link>
    </div>
  );
}
