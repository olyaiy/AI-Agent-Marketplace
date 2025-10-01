'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Search, ChevronLeft, ChevronRight, MessageSquare, Calendar, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';

interface ConversationSearchResult {
  id: string;
  title: string | null;
  agentTag: string;
  agentName: string;
  messageCount: number;
  preview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  matchType: 'title' | 'content' | 'none';
  relevanceScore: number;
}

interface SearchResponse {
  conversations: ConversationSearchResult[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

const fetcher = async (url: string): Promise<SearchResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
};

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const router = useRouter();

  // Build query string
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    params.set('page', page.toString());
    params.set('limit', '20');
    
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date | undefined;
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
      
      if (startDate) {
        params.set('startDate', startDate.toISOString());
      }
    }
    
    return params.toString();
  }, [debouncedSearch, page, dateFilter]);

  const { data, error, isLoading } = useSWR<SearchResponse>(
    `/api/conversations/search?${buildQueryString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.totalCount / (data.limit || 20)) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Conversations</h1>
        <p className="text-muted-foreground mt-1">
          Search and browse your conversation history
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={dateFilter} onValueChange={handleDateFilterChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Past week</SelectItem>
            <SelectItem value="month">Past month</SelectItem>
            <SelectItem value="year">Past year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      {!isLoading && data && (
        <div className="text-sm text-muted-foreground">
          {data.totalCount === 0 ? (
            searchQuery ? 'No conversations found' : 'No conversations yet'
          ) : (
            <>
              Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, data.totalCount)} of {data.totalCount} conversations
            </>
          )}
        </div>
      )}

      {/* Conversation List */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        ) : error ? (
          // Error state
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Failed to load conversations</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : data?.conversations.length === 0 ? (
          // Empty state
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search query or filters'
                  : 'Start a conversation with an agent to see it here'
                }
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link href="/">Browse Agents</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          // Conversation cards
          data?.conversations.map((conversation) => {
            const agentId = conversation.agentTag.startsWith('@') 
              ? conversation.agentTag.slice(1) 
              : conversation.agentTag;
            const displayTitle = conversation.title || `Chat ${conversation.id.slice(0, 8)}`;
            const date = new Date(conversation.lastMessageAt || conversation.createdAt);
            const relativeTime = formatRelativeTime(date);

            return (
              <Card 
                key={conversation.id} 
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/agent/${agentId}/${conversation.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl line-clamp-1">
                        {searchQuery && conversation.matchType === 'title' ? (
                          <HighlightedText text={displayTitle} query={searchQuery} />
                        ) : (
                          displayTitle
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <span className="font-medium">{conversation.agentName}</span>
                        {' • '}
                        {conversation.messageCount} {conversation.messageCount === 1 ? 'message' : 'messages'}
                        {' • '}
                        {relativeTime}
                      </CardDescription>
                    </div>
                    {conversation.matchType !== 'none' && (
                      <Badge variant="secondary" className="shrink-0">
                        {conversation.matchType === 'title' ? 'Title match' : 'Content match'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {conversation.preview && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {searchQuery && conversation.matchType === 'content' ? (
                        <HighlightedText text={conversation.preview} query={searchQuery} />
                      ) : (
                        conversation.preview
                      )}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {data && data.totalCount > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={!data.hasMore || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

