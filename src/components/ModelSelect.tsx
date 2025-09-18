"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  React.useEffect(() => setSelected(value), [value])

  function handleValueChange(next: string) {
    setSelected(next)
    if (onChange) onChange(next)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">Model</label>
      <Select value={selected} onValueChange={handleValueChange}>
        <SelectTrigger className="min-w-[280px]">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => {
            const composite = `${m.provider}:${m.id}`
            return (
              <SelectItem key={composite} value={composite}>
              <span className="truncate max-w-[520px]">{m.name}</span>
              <span className="text-muted-foreground text-xs">{m.id}</span>
            </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}


