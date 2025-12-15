'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Calendar,
  Lock,
  MessageCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

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
  if (!res.ok) {
    const error = new Error('Failed to fetch conversations') as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

const ITEMS_PER_PAGE = 20;

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const debouncedSearch = useDebounce(searchQuery, 300);


  // Build query string
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    params.set('page', page.toString());
    params.set('limit', ITEMS_PER_PAGE.toString());

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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    setPage(1);
  };

  // Group conversations by date sections
  const groupedConversations = useMemo(() => {
    if (!data?.conversations) return {};

    // If searching, don't group, return single list under "Search Results"
    if (debouncedSearch) {
      return { 'Search Results': data.conversations };
    }

    const groups: Record<string, ConversationSearchResult[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'This Month': [],
      'Older': []
    };

    data.conversations.forEach(conv => {
      const date = new Date(conv.lastMessageAt || conv.createdAt);
      if (isToday(date)) {
        groups['Today'].push(conv);
      } else if (isYesterday(date)) {
        groups['Yesterday'].push(conv);
      } else if (isThisWeek(date)) {
        groups['This Week'].push(conv);
      } else {
        groups['Older'].push(conv);
      }
    });

    return Object.fromEntries(
      Object.entries(groups).filter(([, items]) => items.length > 0)
    );
  }, [data?.conversations, debouncedSearch]);

  const totalPages = data ? Math.ceil(data.totalCount / (data.limit || ITEMS_PER_PAGE)) : 0;
  const isUnauthorized = error && (error as Error & { status?: number }).status === 401;

  if (isUnauthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-transparent border-0 shadow-none">
          <CardContent className="py-12 text-center space-y-6">
            <div className="rounded-full bg-secondary/30 w-16 h-16 mx-auto flex items-center justify-center backdrop-blur-sm">
              <Lock className="h-8 w-8 text-secondary-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight">Sign in to view conversations</h3>
              <p className="text-muted-foreground">
                Access your chat history across all devices
              </p>
            </div>
            <div className="pt-2">
              <GoogleSignInButton />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 py-8 md:py-12">
      {/* Header Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Conversations</h1>
            <p className="text-muted-foreground text-lg">
              Manage and revisit your AI interactions
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-4 -my-4 border-b border-border/40 sm:border-0 sm:static sm:bg-transparent sm:py-0">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="search"
              placeholder="Search by title or content..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-11 bg-secondary/20 border-transparent hover:bg-secondary/40 focus:bg-background focus:border-primary/20 transition-all rounded-xl"
            />
          </div>
          <Select value={dateFilter} onValueChange={handleDateFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl bg-background border-border/50 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All time" />
              </div>
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
      </div>

      {/* Main Content Area */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32 rounded-full" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-32 rounded-full" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="bg-destructive/10 p-4 rounded-full">
              <MessageCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-muted-foreground">Failed to load conversations</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        ) : data?.conversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center space-y-6"
          >
            <div className="bg-secondary/30 p-6 rounded-3xl">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-semibold">
                {searchQuery ? 'No matches found' : 'No conversations yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Try adjusting your search terms or filters to find what you looking for.'
                  : 'Start chatting with an agent to see your history here.'
                }
              </p>
            </div>
            {!searchQuery && (
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/">Browse Agents</Link>
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-10">
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedConversations).map(([groupName, items], groupIndex) => (
                <motion.div
                  key={groupName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.1 }}
                  className="space-y-4"
                >
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    {groupName}
                  </h2>
                  <div className="divide-y divide-border/40">
                    {items.map((conversation, index) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        searchQuery={searchQuery}
                        index={index}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalCount > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-12 py-4 border-t border-border/40">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="rounded-full hover:bg-secondary"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <span className="text-sm font-medium text-muted-foreground">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage(p => p + 1)}
              disabled={!data.hasMore || isLoading}
              className="rounded-full hover:bg-secondary"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  searchQuery,
  index
}: {
  conversation: ConversationSearchResult;
  searchQuery: string;
  index: number;
}) {
  const router = useRouter();
  const agentId = conversation.agentTag.startsWith('@')
    ? conversation.agentTag.slice(1)
    : conversation.agentTag;

  const displayTitle = conversation.title || `Chat ${conversation.id.slice(0, 8)}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => router.push(`/agent/${agentId}/${conversation.id}`)}
      className="group relative cursor-pointer"
    >
      <div className={cn(
        "flex flex-col sm:flex-row items-start gap-4 py-4 px-4 rounded-lg transition-all duration-200",
        "hover:bg-muted/50 border border-transparent"
      )}>
        {/* Icon/Avatar Placeholder - optional, keeps it clean without for now or use the agent avatar if available later */}

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn(
              "font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary transition-colors",
              "group-hover:bg-primary/15"
            )}>
              @{conversation.agentName}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-muted-foreground/60">
              {formatRelativeTime(new Date(conversation.lastMessageAt || conversation.createdAt))}
            </span>
            {conversation.matchType !== 'none' && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal ml-auto sm:ml-2 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                {conversation.matchType === 'title' ? 'Title match' : 'Content match'}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {searchQuery && conversation.matchType === 'title' ? (
                <HighlightedText text={displayTitle} query={searchQuery} />
              ) : (
                displayTitle
              )}
            </h3>
          </div>

          {conversation.preview && (
            <p className="text-sm text-muted-foreground/60 line-clamp-1">
              {searchQuery && conversation.matchType === 'content' ? (
                <HighlightedText text={conversation.preview} query={searchQuery} />
              ) : (
                conversation.preview
              )}
            </p>
          )}
        </div>

        <div className="hidden sm:flex items-center self-center pl-4">
          <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </motion.div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-sm px-0.5 font-medium">
            {part}
          </span>
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
  return format(date, 'MMM d, yyyy');
}
