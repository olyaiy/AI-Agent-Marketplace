"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';

interface AgentSearchProps {
  className?: string;
}

export function AgentSearch({ className }: AgentSearchProps) {
  const searchParams = useSearchParams();
  const existingQuery = searchParams.get('q') ?? '';
  const [value, setValue] = useState(existingQuery);
  const router = useRouter();
  const pathname = usePathname();

  // debounce value to avoid excessive URL updates
  const debounced = useDebouncedValue(value, 200);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debounced) params.set('q', debounced);
    else params.delete('q');
    // Reset pagination when search term changes
    params.delete('page');
    const next = `${pathname}?${params.toString()}`;
    router.replace(next, { scroll: false });
  }, [debounced, pathname, router, searchParams]);

  useEffect(() => {
    // keep input in sync when user navigates back/forward
    setValue(existingQuery);
  }, [existingQuery]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        inputMode="search"
        placeholder="Search agents..."
        className="pl-9 pr-4 w-full"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

function useDebouncedValue<T>(input: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(input);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(input), delayMs);
    return () => clearTimeout(id);
  }, [input, delayMs]);
  return debouncedValue;
}
