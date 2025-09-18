"use client"

import * as React from "react"
import Image from "next/image"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface ModelOption {
  id: string
  name: string
  provider: string
}

interface Props {
  models: ModelOption[]
  value?: string
  onChange?: (modelId: string) => void
}

export function ModelSelect({ models, value, onChange }: Props) {
  const [selected, setSelected] = React.useState<string | undefined>(value)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => setSelected(value), [value])

  function setSelection(next: string) {
    setSelected(next)
    if (onChange) onChange(next)
    setOpen(false)
  }

  const filterFn = React.useCallback(
    (value: string, search: string, keywords?: string[]) => {
      const q = search.trim().toLowerCase()
      if (!q) return 1
      if (value.toLowerCase().includes(q)) return 1
      if (keywords && keywords.some((k) => k.includes(q))) return 1
      return -1
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
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
  }, [models])

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
                <Image
                  src={`https://models.dev/logos/${selectedModel.provider}.svg`}
                  alt={`${selectedModel.provider} logo`}
                  width={16}
                  height={16}
                  loading="lazy"
                  className="size-4 shrink-0"
                />
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
        <PopoverContent className="p-0 w-[520px]">
          <Command filter={filterFn}>
            <CommandInput placeholder="Search models by name, id, or provider..." />
            <CommandList>
              <CommandEmpty>No models found.</CommandEmpty>
              {modelsByProvider.map(([provider, items]) => (
                <CommandGroup key={provider} heading={provider}>
                  {items.map((m) => {
                    const composite = `${m.provider}:${m.id}`
                    return (
                      <CommandItem
                        key={composite}
                        value={composite}
                        keywords={[m.name.toLowerCase(), m.id.toLowerCase(), m.provider.toLowerCase()]}
                        onSelect={setSelection}
                      >
                        <div className="flex items-center gap-2">
                          <Image
                            src={`https://models.dev/logos/${m.provider}.svg`}
                            alt={`${m.provider} logo`}
                            width={18}
                            height={18}
                            loading="lazy"
                            className="size-4 shrink-0"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm">{m.name}</span>
                            <span className="text-muted-foreground text-xs">{m.id}</span>
                          </div>
                        </div>
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


