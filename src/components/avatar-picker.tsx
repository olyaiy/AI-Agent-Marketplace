"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import Image from "next/image";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  avatars: string[];
  value?: string;
  onChange: (value?: string) => void;
  className?: string;
}

export function AvatarPicker({ avatars, value, onChange, className }: AvatarPickerProps) {
  const [open, setOpen] = React.useState(false);

  function handleSelect(url: string) {
    onChange(url);
    setOpen(false);
  }

  function handleClear() {
    onChange(undefined);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Choose avatar"
          className={cn(
            "group relative flex size-32 items-center justify-center rounded-md border border-input bg-background text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden cursor-pointer",
            className
          )}
        >
          {value ? (
            <Image
              src={value}
              alt="Selected avatar"
              fill
              sizes="8rem"
              quality={95}
              className="object-contain transition-transform duration-200 ease-out group-hover:scale-105"
            />
          ) : (
            <Plus className="size-6" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Choose avatar</div>
          {value ? (
            <button
              type="button"
              className="text-xs underline"
              onClick={handleClear}
            >
              Remove
            </button>
          ) : null}
        </div>
        {avatars.length ? (
          <div className="max-h-[240px] overflow-y-auto overflow-x-hidden pr-2 -mr-2">
            <div className="grid grid-cols-3 gap-3">
              {avatars.map((url) => {
                const isActive = value === url;
                return (
                  <button
                    key={url}
                    type="button"
                    aria-label={`Select avatar ${url}`}
                    onClick={() => handleSelect(url)}
                    className={cn(
                      "group rounded-md p-1 border outline-none transition focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                      isActive ? "border-foreground" : "border-transparent"
                    )}
                  >
                    <div className="relative w-20 h-20 overflow-hidden rounded-sm bg-muted/20">
                      <Image
                        src={url}
                        alt={url.split("/").pop() ?? "Avatar"}
                        fill
                        sizes="5rem"
                        quality={90}
                        className="object-contain transition-transform duration-200 ease-out group-hover:scale-105"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No avatars found.</div>
        )}
      </PopoverContent>
    </Popover>
  );
}


