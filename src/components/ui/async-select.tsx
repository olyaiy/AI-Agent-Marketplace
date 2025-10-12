"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
 
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
 
export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
}
 
export interface AsyncSelectProps<T> {
  /** Async function to fetch options */
  fetcher: (query?: string) => Promise<T[]>;
  /** Preload all data ahead of time */
  preload?: boolean;
  /** Function to filter options */
  filterFn?: (option: T, query: string) => boolean;
  /** Function to render each option */
  renderOption: (option: T) => React.ReactNode;
  /** Function to get the value from an option */
  getOptionValue: (option: T) => string;
  /** Function to get the display value for the selected option */
  getDisplayValue: (option: T) => React.ReactNode;
  /** Custom not found message */
  notFound?: React.ReactNode;
  /** Custom loading skeleton */
  loadingSkeleton?: React.ReactNode;
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Label for the select field */
  label: string;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Disable the entire select */
  disabled?: boolean;
  /** Custom width for the popover */
  width?: string | number;
  /** Custom class names */
  className?: string;
  /** Custom trigger button class names */
  triggerClassName?: string;
  /** Custom no results message */
  noResultsMessage?: string;
  /** Allow clearing the selection */
  clearable?: boolean;
  /** Recommended items to show when search is empty */
  recommendedItems?: T[];
  /** Label for recommended section */
  recommendedLabel?: string;
  /** Function to group options into sections (only when search is empty) */
  groupByFn?: (options: T[]) => Array<{ label: string; items: T[] }>;
  /** Enable simple virtualization for large lists (flat list only) */
  virtualize?: boolean;
  /** Virtual row height (px) */
  rowHeight?: number;
  /** Max height for the list (px) */
  listHeight?: number;
  /** Number of extra rows to render above/below the viewport */
  overscan?: number;
}
 
export function AsyncSelect<T>({
  fetcher,
  preload,
  filterFn,
  renderOption,
  getOptionValue,
  getDisplayValue,
  notFound,
  loadingSkeleton,
  label,
  placeholder = "Select...",
  value,
  onChange,
  disabled = false,
  width = "200px",
  className,
  triggerClassName,
  noResultsMessage,
  clearable = true,
  recommendedItems = [],
  recommendedLabel = "Recommended",
  groupByFn,
  virtualize = true,
  rowHeight = 44,
  listHeight = 320,
  overscan = 8,
}: AsyncSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState(value);
  const [selectedOption, setSelectedOption] = useState<T | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, preload ? 0 : 300);
  const [originalOptions, setOriginalOptions] = useState<T[]>([]);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  
  // Use refs to avoid recreating handleSelect on every options change
  const optionsRef = useRef<T[]>([]);
  const getOptionValueRef = useRef(getOptionValue);
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(listHeight);

  // Keep refs in sync
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    getOptionValueRef.current = getOptionValue;
  }, [getOptionValue]);

  // Sync selectedValue and selectedOption when value prop changes
  useEffect(() => {
    setSelectedValue(value);
    if (value && options.length > 0) {
      const option = options.find((opt) => getOptionValue(opt) === value);
      setSelectedOption(option || null);
    } else if (!value) {
      setSelectedOption(null);
    }
  }, [value, options, getOptionValue]);

  // Fetch logic for preload mode
  useEffect(() => {
    if (!preload) return;

    const fetchInitial = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetcher("");
        setOriginalOptions(data);
        setOptions(data);
        setHasLoadedInitial(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch options');
      } finally {
        setLoading(false);
      }
    };

    if (!hasLoadedInitial) {
      fetchInitial();
    }
  }, [preload, fetcher, hasLoadedInitial]);

  // Client-side filtering for preload mode
  useEffect(() => {
    if (!preload || !hasLoadedInitial) return;

    if (debouncedSearchTerm) {
      setOptions(
        originalOptions.filter((option) =>
          filterFn ? filterFn(option, debouncedSearchTerm) : true
        )
      );
    } else {
      setOptions(originalOptions);
    }
  }, [preload, debouncedSearchTerm, originalOptions, filterFn, hasLoadedInitial]);

  // Server-side search for non-preload mode
  useEffect(() => {
    if (preload) return;

    // Avoid redundant fetch on open when we've already prefetched initial data
    if (hasLoadedInitial && debouncedSearchTerm === "") return;

    const fetchWithSearch = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetcher(debouncedSearchTerm);
        setOptions(data);
        if (!hasLoadedInitial) setHasLoadedInitial(true);
        setIsPrefetching(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch options');
        setIsPrefetching(false);
      } finally {
        setLoading(false);
      }
    };

    fetchWithSearch();
  }, [preload, debouncedSearchTerm, fetcher, hasLoadedInitial]);

  // Prefetch function for eager loading
  const handlePrefetch = useCallback(() => {
    if (preload || hasLoadedInitial || isPrefetching || loading) return;

    // Clear any existing timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Prefetch after short delay (user intent confirmation)
    prefetchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsPrefetching(true);
        const data = await fetcher("");
        setOptions(data);
        setHasLoadedInitial(true);
        setIsPrefetching(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to prefetch options');
        setIsPrefetching(false);
      }
    }, 100); // 100ms delay - feels instant but avoids unnecessary fetches
  }, [preload, hasLoadedInitial, isPrefetching, loading, fetcher]);

  // Cancel prefetch if user moves away quickly
  const handleCancelPrefetch = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  // Measure list height when popover opens
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const measure = () => setContainerHeight(el.clientHeight || listHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, listHeight]);
 
  const handleSelect = useCallback((currentValue: string) => {
    const newValue = clearable && currentValue === selectedValue ? "" : currentValue;
    const newOption = optionsRef.current.find((option) => getOptionValueRef.current(option) === newValue) || null;
    
    // Optimistically update UI immediately
    setSelectedValue(newValue);
    setSelectedOption(newOption);
    
    // Close popover with slight delay for visual feedback
    requestAnimationFrame(() => {
      setOpen(false);
    });
    
    // Call onChange after UI update
    onChange(newValue);
  }, [selectedValue, onChange, clearable]);
 
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between transition-all duration-150",
            disabled && "opacity-50 cursor-not-allowed",
            triggerClassName
          )}
          style={{ width: width }}
          disabled={disabled}
          onMouseEnter={handlePrefetch}
          onMouseLeave={handleCancelPrefetch}
          onFocus={handlePrefetch}
          onBlur={handleCancelPrefetch}
        >
          {selectedOption ? (
            getDisplayValue(selectedOption)
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="opacity-50" size={10} />
        </Button>
      </PopoverTrigger>
      <PopoverContent style={{ width: width }} className={cn("p-0", className)}>
        <Command>
          <div className="relative border-b w-full">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="focus-visible:ring-0 rounded-b-none border-none pl-8 flex-1"
            />
            {loading && options.length > 0 && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
          <CommandList
            ref={listRef as any}
            onScroll={virtualize ? (e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop) : undefined}
            style={virtualize ? { maxHeight: listHeight, overflowY: 'auto' } : undefined}
          >
            {error && (
              <div className="p-4 text-destructive text-center">
                {error}
              </div>
            )}
            {loading && options.length === 0 && (
              loadingSkeleton || <DefaultLoadingSkeleton />
            )}
            {!loading && !error && options.length === 0 && (
              notFound || <CommandEmpty>{noResultsMessage ?? `No ${label.toLowerCase()} found.`}</CommandEmpty>
            )}
            {!loading && !error && !searchTerm && recommendedItems.length > 0 && (
              <CommandGroup heading={recommendedLabel}>
                {recommendedItems.map((option) => (
                  <CommandItem
                    key={getOptionValue(option)}
                    value={getOptionValue(option)}
                    onSelect={handleSelect}
                    className="cursor-pointer active:scale-[0.98] transition-transform duration-75"
                  >
                    {renderOption(option)}
                    <Check
                      className={cn(
                        "ml-auto h-3 w-3 transition-opacity duration-150",
                        selectedValue === getOptionValue(option) ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {options.length > 0 && !searchTerm && groupByFn ? (
              <>
                {groupByFn(options).map((group) => (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.items.map((option) => (
                      <CommandItem
                        key={getOptionValue(option)}
                        value={getOptionValue(option)}
                        onSelect={handleSelect}
                        className="cursor-pointer active:scale-[0.98] transition-transform duration-75"
                      >
                        {renderOption(option)}
                        <Check
                          className={cn(
                            "ml-auto h-3 w-3 transition-opacity duration-150",
                            selectedValue === getOptionValue(option) ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            ) : options.length > 0 ? (
              <>
                {virtualize ? (
                  (() => {
                    const total = options.length;
                    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
                    const visibleCount = Math.ceil(containerHeight / rowHeight) + overscan * 2;
                    const endIndex = Math.min(total, startIndex + visibleCount);
                    const offsetTop = startIndex * rowHeight;
                    const bottomSpacer = (total - endIndex) * rowHeight;
                    const slice = options.slice(startIndex, endIndex);
                    return (
                      <div style={{ position: 'relative' }}>
                        <div style={{ height: offsetTop }} />
                        <CommandGroup heading={!searchTerm && recommendedItems.length > 0 ? "All Models" : undefined}>
                          {slice.map((option) => (
                            <CommandItem
                              key={getOptionValue(option)}
                              value={getOptionValue(option)}
                              onSelect={handleSelect}
                              className="cursor-pointer active:scale-[0.98] transition-transform duration-75"
                              style={{ height: rowHeight }}
                            >
                              {renderOption(option)}
                              <Check
                                className={cn(
                                  "ml-auto h-3 w-3 transition-opacity duration-150",
                                  selectedValue === getOptionValue(option) ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <div style={{ height: bottomSpacer }} />
                      </div>
                    );
                  })()
                ) : (
                  <CommandGroup heading={!searchTerm && recommendedItems.length > 0 ? "All Models" : undefined}>
                    {options.map((option) => (
                      <CommandItem
                        key={getOptionValue(option)}
                        value={getOptionValue(option)}
                        onSelect={handleSelect}
                        className="cursor-pointer active:scale-[0.98] transition-transform duration-75"
                      >
                        {renderOption(option)}
                        <Check
                          className={cn(
                            "ml-auto h-3 w-3 transition-opacity duration-150",
                            selectedValue === getOptionValue(option) ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
 
function DefaultLoadingSkeleton() {
  return (
    <CommandGroup>
      {[1, 2, 3].map((i) => (
        <CommandItem key={i} disabled>
          <div className="flex items-center gap-2 w-full">
            <div className="h-6 w-6 rounded-full animate-pulse bg-muted" />
            <div className="flex flex-col flex-1 gap-1">
              <div className="h-4 w-24 animate-pulse bg-muted rounded" />
              <div className="h-3 w-16 animate-pulse bg-muted rounded" />
            </div>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}