"use client"

import * as React from "react"
import Image from "next/image"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronDown, X, Filter } from "lucide-react"

function tokenize(input: string): string[] {
  const base = input.toLowerCase()
  const parts = base.split(/[^a-z0-9]+/g).filter(Boolean)
  const collapsed = base.replace(/[^a-z0-9]/g, "")
  return collapsed ? [...new Set([...parts, collapsed])] : parts
}

// subsequence matching intentionally disabled to avoid false positives

function expandAliases(tokens: string[]): string[] {
  const aliasMap: Record<string, string[]> = {
    chatgpt: ["chat", "gpt", "openai"],
    openai: ["gpt"],
    anthropic: ["claude"],
    claude: ["anthropic"],
    google: ["gemini"],
    gemini: ["google"],
    meta: ["llama", "meta-llama"],
    llama: ["meta", "meta-llama"],
    xai: ["grok"],
    grok: ["xai"],
    mistral: ["mistralai"],
    mistralai: ["mistral"],
  }
  const out = new Set(tokens)
  for (const t of tokens) {
    const aliases = aliasMap[t]
    if (aliases) for (const a of aliases) out.add(a)
  }
  return [...out]
}

function buildKeywords(provider: string, name: string, id: string): string[] {
  const tokens = [
    ...tokenize(provider),
    ...tokenize(name),
    ...tokenize(id),
  ]
  return expandAliases(tokens)
}

export interface ModelOption {
  id: string
  name: string
  provider: string
  description?: string
  pricing?: {
    input?: number | string
    output?: number | string
    cachedInputTokens?: number | string
    cacheCreationInputTokens?: number | string
  }
  specification?: ModelSpecification
}

interface ModelSpecification {
  specificationVersion?: string
  provider?: string
  modelId?: string
  [key: string]: unknown
}

interface Props {
  models: ModelOption[]
  value?: string
  onChange?: (modelId: string) => void
  showLogos?: boolean
}

export function ModelSelect({ models, value, onChange, showLogos = true }: Props) {
  const [selected, setSelected] = React.useState<string | undefined>(value)
  const [open, setOpen] = React.useState(false)
  const [hovered, setHovered] = React.useState<string | undefined>(undefined)
  const [selectedProviders, setSelectedProviders] = React.useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [filtersVisible, setFiltersVisible] = React.useState(false)

  React.useEffect(() => setSelected(value), [value])
  // Log all models and their properties
  React.useEffect(() => {
    console.log('=== MODELS DATA ===')
    models.forEach((model, index) => {
      console.log(`Model ${index + 1}:`, model)
      console.log(`--- Properties for ${model.provider}:${model.id} ---`)
      console.log('ID:', model.id)
      console.log('Name:', model.name)
      console.log('Provider:', model.provider)
      console.log('Description:', model.description)
      console.log('Pricing:', model.pricing)
      console.log('Specification:', model.specification)
      console.log('--- End of model properties ---')
    })
    console.log('=== END MODELS DATA ===')
  }, [models])

  function setSelection(next: string) {
    setSelected(next)
    if (onChange) onChange(next)
    setOpen(false)
  }

  const filterFn = React.useCallback(
    (value: string, search: string, keywords?: string[]) => {
      const q = search.trim().toLowerCase()
      if (!q) return 1
      const hayTokens = (keywords ?? []).map((k) => k.toLowerCase())
      const hayStr = (value + " " + hayTokens.join(" ")).toLowerCase()

      // Build query tokens: allow aliases and collapsed variant
      const qTokens = expandAliases(tokenize(q))
      if (!qTokens.length) return -1

      // Require every query token to appear as a substring of some keyword
      for (const t of qTokens) {
        const has = hayTokens.some((k) => k.includes(t)) || hayStr.includes(t)
        if (!has) return -1
      }
      // Optional boost if full phrase appears
      return hayStr.includes(q) ? 10 : 1
    },
    []
  )

  const selectedModel = React.useMemo(() => {
    if (!selected) return undefined
    const idx = models.findIndex((m) => `${m.provider}:${m.id}` === selected)
    if (idx === -1) return undefined
    return models[idx]
  }, [selected, models])

  const modelsByProvider = React.useMemo(() => {
    const grouped: Record<string, ModelOption[]> = {}
    for (const m of models) {
      if (!grouped[m.provider]) grouped[m.provider] = []
      grouped[m.provider].push(m)
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.name.localeCompare(b.name))
    }
    const priority: Record<string, number> = {
      openai: 0,
      anthropic: 1,
      google: 2,
    }
    return Object.entries(grouped).sort((a, b) => {
      const pa = priority[a[0]] ?? 99
      const pb = priority[b[0]] ?? 99
      if (pa !== pb) return pa - pb
      return a[0].localeCompare(b[0])
    })
  }, [models])

  function formatPricePerMillion(input: number | string | undefined): string {
    if (input === undefined || input === null) return "—"
    const n = typeof input === "string" ? Number(input) : input
    if (!isFinite(n)) return "—"
    const perMillion = n * 1_000_000
    const fractionDigits = perMillion < 1 ? 4 : 2
    const formatted = perMillion.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
    return `$${formatted} / 1M tokens`
  }

  function toPricePerMillion(input: number | string | undefined): number | undefined {
    if (input === undefined || input === null) return undefined
    const n = typeof input === "string" ? Number(input) : input
    if (!isFinite(n)) return undefined
    return n * 1_000_000
  }

  function getProviderIdForLogo(model: ModelOption): string {
    const fullId = typeof model.specification?.modelId === "string" ? model.specification.modelId : undefined
    const fromFull = fullId && fullId.includes("/") ? fullId.split("/")[0] : undefined
    const fallback = (model.provider || "").split("/")[0]
    return (fromFull || fallback).trim().toLowerCase()
  }

  const allProviderIds = React.useMemo(() => {
    const s = new Set<string>()
    for (const m of models) s.add(getProviderIdForLogo(m))
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [models])

  const inputMinMax = React.useMemo(() => {
    let min = Number.POSITIVE_INFINITY
    let max = 0
    for (const m of models) {
      const v = toPricePerMillion(m.pricing?.input)
      if (v === undefined) continue
      if (v < min) min = v
      if (v > max) max = v
    }
    if (!isFinite(min)) min = 0
    if (max < min) max = min
    return [min, max] as [number, number]
  }, [models])

  const outputMinMax = React.useMemo(() => {
    let min = Number.POSITIVE_INFINITY
    let max = 0
    for (const m of models) {
      const v = toPricePerMillion(m.pricing?.output)
      if (v === undefined) continue
      if (v < min) min = v
      if (v > max) max = v
    }
    if (!isFinite(min)) min = 0
    if (max < min) max = min
    return [min, max] as [number, number]
  }, [models])

  const [inputRange, setInputRange] = React.useState<[number, number]>([inputMinMax[0], inputMinMax[1]])
  const [outputRange, setOutputRange] = React.useState<[number, number]>([outputMinMax[0], outputMinMax[1]])

  React.useEffect(() => {
    setInputRange([inputMinMax[0], inputMinMax[1]])
  }, [inputMinMax])
  React.useEffect(() => {
    setOutputRange([outputMinMax[0], outputMinMax[1]])
  }, [outputMinMax])

  function isRangeActive(range: [number, number], minMax: [number, number]): boolean {
    const [min, max] = minMax
    return Math.abs(range[0] - min) > 1e-9 || Math.abs(range[1] - max) > 1e-9
  }

  const providerFilterActive = selectedProviders.length > 0
  const inputFilterActive = isRangeActive(inputRange, inputMinMax)
  const outputFilterActive = isRangeActive(outputRange, outputMinMax)
  const anyFilterActive = providerFilterActive || inputFilterActive || outputFilterActive

  const filteredModels = React.useMemo(() => {
    return models.filter((m) => {
      const providerId = getProviderIdForLogo(m)
      if (providerFilterActive && !selectedProviders.includes(providerId)) return false
      if (inputFilterActive) {
        const val = toPricePerMillion(m.pricing?.input)
        if (val === undefined) return false
        if (val < inputRange[0] - 1e-9 || val > inputRange[1] + 1e-9) return false
      }
      if (outputFilterActive) {
        const val = toPricePerMillion(m.pricing?.output)
        if (val === undefined) return false
        if (val < outputRange[0] - 1e-9 || val > outputRange[1] + 1e-9) return false
      }
      return true
    })
  }, [models, providerFilterActive, selectedProviders, inputFilterActive, inputRange, outputFilterActive, outputRange])

  const modelsByProviderFiltered = React.useMemo(() => {
    const grouped: Record<string, ModelOption[]> = {}
    for (const m of filteredModels) {
      if (!grouped[m.provider]) grouped[m.provider] = []
      grouped[m.provider].push(m)
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.name.localeCompare(b.name))
    }
    const priority: Record<string, number> = { openai: 0, anthropic: 1, google: 2 }
    return Object.entries(grouped).sort((a, b) => {
      const pa = priority[a[0]] ?? 99
      const pb = priority[b[0]] ?? 99
      if (pa !== pb) return pa - pb
      return a[0].localeCompare(b[0])
    })
  }, [filteredModels])

  function resetFilters() {
    setSelectedProviders([])
    setInputRange([inputMinMax[0], inputMinMax[1]])
    setOutputRange([outputMinMax[0], outputMinMax[1]])
  }

  // Auto-show filters when any become active
  React.useEffect(() => {
    if (anyFilterActive && !filtersVisible) {
      setFiltersVisible(true)
    }
  }, [anyFilterActive, filtersVisible])

  function formatCompactPrice(value: number): string {
    if (value === 0) return "$0"
    if (value < 1) return `$${value.toFixed(2)}`
    if (value < 10) return `$${value.toFixed(1)}`
    return `$${Math.round(value).toLocaleString()}`
  }


  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">Model</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex min-w-[280px] items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
            onClick={() => setOpen(!open)}
          >
            {selectedModel ? (
              <span className="flex items-center gap-2 truncate">
                {showLogos && (
                  <Image
                    src={`https://models.dev/logos/${getProviderIdForLogo(selectedModel)}.svg`}
                    alt={`${getProviderIdForLogo(selectedModel)} logo`}
                    width={16}
                    height={16}
                    loading="lazy"
                    className="size-4 shrink-0"
                  />
                )}
                <span className="truncate">
                  {selectedModel.name} ({selectedModel.id})
                </span>
              </span>
            ) : (
              <span className="truncate">Search or select a model</span>
            )}
            <svg className="size-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[600px]">
          <Command filter={filterFn}>
            <div className="relative">
              <CommandInput placeholder="Search models by name, id, or provider..." className="pr-10" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted transition-all duration-200 ${
                      filtersVisible || anyFilterActive ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setFiltersVisible(!filtersVisible)}
                    aria-label={filtersVisible ? "Hide filters" : "Show filters"}
                  >
                    <Filter className={`size-4 transition-transform duration-200 ${filtersVisible ? 'rotate-0' : ''}`} />
                    {anyFilterActive && (
                      <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {filtersVisible ? "Hide filters" : anyFilterActive ? "Filters active - click to manage" : "Show filters"}
                </TooltipContent>
              </Tooltip>
            </div>
            <CommandList>
              <CommandEmpty>No models found.</CommandEmpty>
              {/* Filter Section */}
              {!filtersVisible && anyFilterActive && (
                <div className="border-b bg-primary/5 px-4 py-2 text-center">
                  <span className="text-xs text-muted-foreground">
                    {[providerFilterActive, inputFilterActive, outputFilterActive].filter(Boolean).length} filter(s) active
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 ml-1 text-xs text-primary"
                      onClick={() => setFiltersVisible(true)}
                    >
                      Show
                    </Button>
                  </span>
                </div>
              )}
              {filtersVisible && (
                <div className="border-b bg-muted/30 animate-in slide-in-from-top-2 duration-200">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filters</span>
                      {anyFilterActive && (
                        <Badge variant="secondary" className="h-5 text-xs">
                          {[providerFilterActive, inputFilterActive, outputFilterActive].filter(Boolean).length}
                        </Badge>
                      )}
                    </div>
                    {anyFilterActive && (
                      <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
                        Clear all
                      </Button>
                    )}
                  </div>
                  
                  {/* Active Filters Pills */}
                  {anyFilterActive && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {providerFilterActive && (
                        <Badge variant="outline" className="h-6 gap-1 pr-1">
                          Providers: {selectedProviders.length}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-destructive/20"
                            onClick={() => setSelectedProviders([])}
                          >
                            <X className="size-3" />
                          </Button>
                        </Badge>
                      )}
                      {inputFilterActive && (
                        <Badge variant="outline" className="h-6 gap-1 pr-1">
                          Input: {formatCompactPrice(inputRange[0])}–{formatCompactPrice(inputRange[1])}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-destructive/20"
                            onClick={() => setInputRange([inputMinMax[0], inputMinMax[1]])}
                          >
                            <X className="size-3" />
                          </Button>
                        </Badge>
                      )}
                      {outputFilterActive && (
                        <Badge variant="outline" className="h-6 gap-1 pr-1">
                          Output: {formatCompactPrice(outputRange[0])}–{formatCompactPrice(outputRange[1])}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-destructive/20"
                            onClick={() => setOutputRange([outputMinMax[0], outputMinMax[1]])}
                          >
                            <X className="size-3" />
                          </Button>
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Filter Controls */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Provider Filter */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Providers</label>
                      <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between h-8 text-xs">
                            {selectedProviders.length === 0 ? (
                              "All providers"
                            ) : selectedProviders.length === 1 ? (
                              <span className="capitalize">{selectedProviders[0]}</span>
                            ) : (
                              `${selectedProviders.length} selected`
                            )}
                            <ChevronDown className="size-3 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search providers..." className="h-8" />
                            <CommandList>
                              <CommandEmpty>No providers found.</CommandEmpty>
                              <CommandGroup>
                                {allProviderIds.map((pid) => (
                                  <CommandItem
                                    key={pid}
                                    onSelect={() => {
                                      setSelectedProviders((prev) =>
                                        prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
                                      )
                                    }}
                                  >
                                    <div className="flex items-center gap-2 w-full">
                                      <input
                                        type="checkbox"
                                        readOnly
                                        checked={selectedProviders.includes(pid)}
                                        className="size-3"
                                      />
                                      <span className="capitalize flex-1">{pid}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Input Price Filter */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">Input Price/1M</label>
                        <span className="text-xs text-muted-foreground">
                          {formatCompactPrice(inputRange[0])}–{formatCompactPrice(inputRange[1])}
                        </span>
                      </div>
                      <div className="px-2">
                        <Slider
                          min={inputMinMax[0]}
                          max={inputMinMax[1] || 1}
                          value={[inputRange[0], inputRange[1]]}
                          onValueChange={(vals) =>
                            setInputRange([Number(vals[0]), Number(vals[1] ?? vals[0])])
                          }
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Output Price Filter */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">Output Price/1M</label>
                        <span className="text-xs text-muted-foreground">
                          {formatCompactPrice(outputRange[0])}–{formatCompactPrice(outputRange[1])}
                        </span>
                      </div>
                      <div className="px-2">
                        <Slider
                          min={outputMinMax[0]}
                          max={outputMinMax[1] || 1}
                          value={[outputRange[0], outputRange[1]]}
                          onValueChange={(vals) =>
                            setOutputRange([Number(vals[0]), Number(vals[1] ?? vals[0])])
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              )}
              {(providerFilterActive || inputFilterActive || outputFilterActive ? modelsByProviderFiltered : modelsByProvider).map(([provider, items]) => (
                <CommandGroup key={provider} heading={provider}>
                  {items.map((m) => {
                    const composite = `${m.provider}:${m.id}`
                    const kws = buildKeywords(m.provider, m.name, m.id)
                    const hasMeta = Boolean(m.description || m.pricing)
                    return (
                      <CommandItem
                        key={composite}
                        value={composite}
                        keywords={kws}
                        onSelect={setSelection}
                        onMouseEnter={() => setHovered(composite)}
                        onMouseLeave={() => setHovered(undefined)}
                      >
                        {hasMeta ? (
                          <Popover open={hovered === composite}>
                            <PopoverTrigger asChild>
                              <div className="flex items-center gap-2">
                                {showLogos && (
                                  <Image
                                    src={`https://models.dev/logos/${getProviderIdForLogo(m)}.svg`}
                                    alt={`${getProviderIdForLogo(m)} logo`}
                                    width={18}
                                    height={18}
                                    loading="lazy"
                                    className="size-4 shrink-0"
                                  />
                                )}
                                <div className="flex flex-col">
                                  <span className="text-sm">{m.name}</span>
                                  <span className="text-muted-foreground text-xs">{m.id}</span>
                                </div>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-3">
                              <div className="space-y-2">
                                {m.description && (
                                  <p className="text-sm leading-snug">{m.description}</p>
                                )}
                                {m.pricing && (
                                  <div className="text-xs">
                                    <div className="flex justify-between"><span>Input</span><span>{formatPricePerMillion(m.pricing.input)}</span></div>
                                    <div className="flex justify-between"><span>Output</span><span>{formatPricePerMillion(m.pricing.output)}</span></div>
                                    {m.pricing.cachedInputTokens !== undefined ? (
                                      <div className="flex justify-between"><span>Cached input (read)</span><span>{formatPricePerMillion(m.pricing.cachedInputTokens)}</span></div>
                                    ) : null}
                                    {m.pricing.cacheCreationInputTokens !== undefined ? (
                                      <div className="flex justify-between"><span>Cache creation (write)</span><span>{formatPricePerMillion(m.pricing.cacheCreationInputTokens)}</span></div>
                                    ) : null}
                                  </div>
                                )}
                                {m.specification && (
                                  <div className="text-xs">
                                    {Object.entries(m.specification).slice(0, 6).map(([k, v]) => (
                                      <div className="flex justify-between" key={k}>
                                        <span className="mr-2 truncate max-w-[40%]">{k}</span>
                                        <span className="truncate max-w-[55%]">{typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : '…'}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="flex items-center gap-2">
                            {showLogos && (
                              <Image
                                src={`https://models.dev/logos/${getProviderIdForLogo(m)}.svg`}
                                alt={`${getProviderIdForLogo(m)} logo`}
                                width={18}
                                height={18}
                                loading="lazy"
                                className="size-4 shrink-0"
                              />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm">{m.name}</span>
                              <span className="text-muted-foreground text-xs">{m.id}</span>
                            </div>
                          </div>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}


