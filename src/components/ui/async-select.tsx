"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Check, ChevronsUpDown, Search, Loader2, Filter, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
 
export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  icon?: React.ReactNode;
}

export interface SortOption<T> {
  id: string;
  label: string;
  sortFn: (a: T, b: T) => number;
}

export interface FilterConfig<T> {
  providers?: {
    enabled: boolean;
    extractProvider: (item: T) => string | null;
  };
  contextLength?: {
    enabled: boolean;
    extractContextLength: (item: T) => number | null;
    min: number;
    max: number;
    step?: number;
    formatLabel?: (value: number) => string;
  };
  priceRange?: {
    enabled: boolean;
    extractPrice: (item: T) => number | null;
    min: number;
    max: number;
    step?: number;
    formatLabel?: (value: number) => string;
  };
  sorting?: {
    enabled: boolean;
    options: SortOption<T>[];
    defaultSortId?: string;
  };
}

type GroupedRow<T> = { type: "header"; label: string } | { type: "item"; option: T };
 
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
  /** Filter configuration for advanced filtering */
  filterConfig?: FilterConfig<T>;
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
  filterConfig,
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
  
  // Filter state
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [contextLengthRange, setContextLengthRange] = useState<[number, number] | null>(null);
  const [priceRangeValue, setPriceRangeValue] = useState<[number, number] | null>(null);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [currentSortId, setCurrentSortId] = useState<string | null>(
    filterConfig?.sorting?.defaultSortId ?? null
  );

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
  
  // Extract available providers from options (memoized)
  const availableProviders = useMemo(() => {
    if (!filterConfig?.providers?.enabled) return [];
    const providers = new Set<string>();
    options.forEach((option) => {
      const provider = filterConfig.providers!.extractProvider(option);
      if (provider) providers.add(provider);
    });
    return Array.from(providers).sort();
  }, [options, filterConfig]);
  
  // Apply filters and sorting to options (memoized)
  const filteredOptions = useMemo(() => {
    let filtered = options;
    
    // Provider filter
    if (filterConfig?.providers?.enabled && selectedProviders.size > 0) {
      filtered = filtered.filter((option) => {
        const provider = filterConfig.providers!.extractProvider(option);
        return provider && selectedProviders.has(provider);
      });
    }
    
    // Context length filter
    if (filterConfig?.contextLength?.enabled && contextLengthRange) {
      filtered = filtered.filter((option) => {
        const contextLength = filterConfig.contextLength!.extractContextLength(option);
        if (contextLength === null) return false;
        return contextLength >= contextLengthRange[0] && contextLength <= contextLengthRange[1];
      });
    }
    
    // Price range filter
    if (filterConfig?.priceRange?.enabled && priceRangeValue) {
      filtered = filtered.filter((option) => {
        const price = filterConfig.priceRange!.extractPrice(option);
        if (price === null) return false;
        return price >= priceRangeValue[0] && price <= priceRangeValue[1];
      });
    }
    
    // Apply sorting
    if (filterConfig?.sorting?.enabled && currentSortId) {
      const sortOption = filterConfig.sorting.options.find((opt) => opt.id === currentSortId);
      if (sortOption) {
        filtered = [...filtered].sort(sortOption.sortFn);
      }
    }
    
    return filtered;
  }, [options, filterConfig, selectedProviders, contextLengthRange, priceRangeValue, currentSortId]);
  
  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedProviders.size > 0) count += selectedProviders.size;
    if (contextLengthRange) count += 1;
    if (priceRangeValue) count += 1;
    return count;
  }, [selectedProviders, contextLengthRange, priceRangeValue]);
  
  // Build a flat list of rows (headers + items) for grouped virtualization
  const groupedRows = useMemo(() => {
    if (!groupByFn) return null;
    if (searchTerm) return null;
    // Build groups from the filteredOptions so sorting/filters apply
    const groups = groupByFn(filteredOptions);
    const rows: GroupedRow<T>[] = [];
    for (const group of groups) {
      rows.push({ type: 'header', label: group.label });
      for (const option of group.items) {
        rows.push({ type: 'item', option });
      }
    }
    return rows;
  }, [groupByFn, filteredOptions, searchTerm]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSelectedProviders(new Set());
    setContextLengthRange(null);
    setPriceRangeValue(null);
  }, []);
 
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
          <div className="relative border-b w-full flex items-center">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="focus-visible:ring-0 rounded-b-none border-none pl-8 pr-12 flex-1"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {loading && filteredOptions.length > 0 && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {filterConfig && (
                <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn(
                        "h-7 w-7 p-0",
                        activeFilterCount > 0 && "text-primary"
                      )}
                    >
                      <Filter className="h-4 w-4" />
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Filter & Sort</h4>
                        {activeFilterCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={clearAllFilters}
                          >
                            Clear all
                          </Button>
                        )}
                      </div>
                      
                      {/* Sorting dropdown */}
                      {filterConfig?.sorting?.enabled && filterConfig.sorting.options.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Sort By</Label>
                          <Select
                            value={currentSortId ?? filterConfig.sorting.defaultSortId ?? filterConfig.sorting.options[0].id}
                            onValueChange={setCurrentSortId}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select sort order" />
                            </SelectTrigger>
                            <SelectContent>
                              {filterConfig.sorting.options.map((option) => (
                                <SelectItem key={option.id} value={option.id} className="text-sm">
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {/* Provider filter */}
                      {filterConfig.providers?.enabled && availableProviders.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Providers</Label>
                          <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                            {availableProviders.map((provider) => (
                              <div
                                key={provider}
                                className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                                onClick={() => {
                                  const newSet = new Set(selectedProviders);
                                  if (newSet.has(provider)) {
                                    newSet.delete(provider);
                                  } else {
                                    newSet.add(provider);
                                  }
                                  setSelectedProviders(newSet);
                                }}
                              >
                                <Checkbox
                                  checked={selectedProviders.has(provider)}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(selectedProviders);
                                    if (checked) {
                                      newSet.add(provider);
                                    } else {
                                      newSet.delete(provider);
                                    }
                                    setSelectedProviders(newSet);
                                  }}
                                />
                                <span className="text-sm capitalize">{provider}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Context length slider */}
                      {filterConfig.contextLength?.enabled && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Context Length</Label>
                            <span className="text-xs text-muted-foreground">
                              {contextLengthRange
                                ? `${filterConfig.contextLength.formatLabel?.(contextLengthRange[0]) ?? contextLengthRange[0].toLocaleString()} - ${filterConfig.contextLength.formatLabel?.(contextLengthRange[1]) ?? contextLengthRange[1].toLocaleString()}`
                                : 'Any'}
                            </span>
                          </div>
                          <Slider
                            min={filterConfig.contextLength.min}
                            max={filterConfig.contextLength.max}
                            step={filterConfig.contextLength.step ?? 1000}
                            value={contextLengthRange ?? [filterConfig.contextLength.min, filterConfig.contextLength.max]}
                            onValueChange={(value) => {
                              const [min, max] = value as [number, number];
                              if (min === filterConfig.contextLength!.min && max === filterConfig.contextLength!.max) {
                                setContextLengthRange(null);
                              } else {
                                setContextLengthRange([min, max]);
                              }
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Price range slider */}
                      {filterConfig.priceRange?.enabled && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Price (per M tokens)</Label>
                            <span className="text-xs text-muted-foreground">
                              {priceRangeValue
                                ? `${filterConfig.priceRange.formatLabel?.(priceRangeValue[0]) ?? `$${priceRangeValue[0].toFixed(2)}`} - ${filterConfig.priceRange.formatLabel?.(priceRangeValue[1]) ?? `$${priceRangeValue[1].toFixed(2)}`}`
                                : 'Any'}
                            </span>
                          </div>
                          <Slider
                            min={filterConfig.priceRange.min}
                            max={filterConfig.priceRange.max}
                            step={filterConfig.priceRange.step ?? 0.1}
                            value={priceRangeValue ?? [filterConfig.priceRange.min, filterConfig.priceRange.max]}
                            onValueChange={(value) => {
                              const [min, max] = value as [number, number];
                              if (min === filterConfig.priceRange!.min && max === filterConfig.priceRange!.max) {
                                setPriceRangeValue(null);
                              } else {
                                setPriceRangeValue([min, max]);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          
          {/* Active filter badges row */}
          {filterConfig && activeFilterCount > 0 && (
            <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
              {selectedProviders.size > 0 && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {selectedProviders.size} provider{selectedProviders.size > 1 ? 's' : ''}
                </Badge>
              )}
              {contextLengthRange && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Context: {filterConfig?.contextLength?.formatLabel?.(contextLengthRange[0]) ?? contextLengthRange[0].toLocaleString()} - {filterConfig?.contextLength?.formatLabel?.(contextLengthRange[1]) ?? contextLengthRange[1].toLocaleString()}
                </Badge>
              )}
              {priceRangeValue && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Price: {filterConfig?.priceRange?.formatLabel?.(priceRangeValue[0]) ?? `$${priceRangeValue[0].toFixed(2)}`} - {filterConfig?.priceRange?.formatLabel?.(priceRangeValue[1]) ?? `$${priceRangeValue[1].toFixed(2)}`}
                </Badge>
              )}
            </div>
          )}
          <CommandList
            ref={listRef}
            onScroll={virtualize ? (e) => setScrollTop(e.currentTarget.scrollTop) : undefined}
            style={virtualize ? { maxHeight: listHeight, overflowY: 'auto' } : undefined}
          >
            {error && (
              <div className="p-4 text-destructive text-center">
                {error}
              </div>
            )}
            {loading && filteredOptions.length === 0 && (
              loadingSkeleton || <DefaultLoadingSkeleton />
            )}
            {!loading && !error && filteredOptions.length === 0 && (
              notFound || <CommandEmpty>{noResultsMessage ?? `No ${label.toLowerCase()} found.`}</CommandEmpty>
            )}
            {!loading && !error && !searchTerm && activeFilterCount === 0 && recommendedItems.length > 0 && (
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
            {filteredOptions.length > 0 ? (
              <>
                {virtualize ? (
                  (() => {
                    const isGrouped = Array.isArray(groupedRows);
                    const total = isGrouped && groupedRows ? groupedRows.length : filteredOptions.length;
                    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
                    const visibleCount = Math.ceil(containerHeight / rowHeight) + overscan * 2;
                    const endIndex = Math.min(total, startIndex + visibleCount);
                    const offsetTop = startIndex * rowHeight;
                    const bottomSpacer = (total - endIndex) * rowHeight;
                    const sharedHeading =
                      !searchTerm && activeFilterCount === 0 && recommendedItems.length > 0 ? "All Models" : undefined;
                    return (
                      <div style={{ position: 'relative' }}>
                        <div style={{ height: offsetTop }} />
                        {isGrouped && groupedRows ? (
                          <CommandGroup heading={sharedHeading}>
                            {groupedRows.slice(startIndex, endIndex).map((row, idx) =>
                              row.type === "header" ? (
                                <div
                                  key={`__header-${row.label}-${startIndex + idx}`}
                                  className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                                  style={{ height: rowHeight, display: "flex", alignItems: "center" }}
                                  role="separator"
                                >
                                  {row.label}
                                </div>
                              ) : (
                                <CommandItem
                                  key={getOptionValue(row.option)}
                                  value={getOptionValue(row.option)}
                                  onSelect={handleSelect}
                                  className="cursor-pointer active:scale-[0.98] transition-transform duration-75"
                                  style={{ height: rowHeight }}
                                >
                                  {renderOption(row.option)}
                                  <Check
                                    className={cn(
                                      "ml-auto h-3 w-3 transition-opacity duration-150",
                                      selectedValue === getOptionValue(row.option) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              )
                            )}
                          </CommandGroup>
                        ) : (
                          <CommandGroup heading={sharedHeading}>
                            {filteredOptions.slice(startIndex, endIndex).map((option) => (
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
                        )}
                        <div style={{ height: bottomSpacer }} />
                      </div>
                    );
                  })()
                ) : (
                  groupedRows ? (
                    <>
                      {groupByFn!(filteredOptions).map((group) => (
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
                  ) : (
                    <CommandGroup heading={!searchTerm && activeFilterCount === 0 && recommendedItems.length > 0 ? "All Models" : undefined}>
                      {filteredOptions.map((option) => (
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
                  )
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
