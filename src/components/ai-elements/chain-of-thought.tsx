"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  BrainIcon,
  ChevronDownIcon,
  DotIcon,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { createContext, memo, useContext, useEffect, useMemo, useState } from "react";
import { Response } from "./response";

type ChainOfThoughtContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isStreaming: boolean;
  duration: number;
};

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(
  null
);

export const useChainOfThought = () => {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error(
      "ChainOfThought components must be used within ChainOfThought"
    );
  }
  return context;
};

export type ChainOfThoughtProps = ComponentProps<"div"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  isStreaming?: boolean;
};

const AUTO_CLOSE_DELAY = 1000;

export const ChainOfThought = memo(
  ({
    className,
    open,
    defaultOpen = false,
    onOpenChange,
    isStreaming = false,
    children,
    ...props
  }: ChainOfThoughtProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });

    const [duration, setDuration] = useState(0);
    const [hasAutoClosedRef, setHasAutoClosedRef] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Track duration when streaming starts and ends
    useEffect(() => {
      if (isStreaming) {
        if (startTime === null) {
          setStartTime(Date.now());
        }
      } else if (startTime !== null) {
        setDuration(Math.round((Date.now() - startTime) / 1000));
        setStartTime(null);
      }
    }, [isStreaming, startTime]);

    // Auto-open when streaming starts, auto-close when streaming ends (once only)
    useEffect(() => {
      if (isStreaming && !isOpen) {
        setIsOpen(true);
      } else if (!isStreaming && isOpen && !defaultOpen && !hasAutoClosedRef) {
        // Add a small delay before closing to allow user to see the content
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosedRef(true);
        }, AUTO_CLOSE_DELAY);
        return () => clearTimeout(timer);
      }
    }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosedRef]);

    const chainOfThoughtContext = useMemo(
      () => ({ isOpen: isOpen ?? false, setIsOpen, isStreaming, duration }),
      [isOpen, setIsOpen, isStreaming, duration]
    );

    return (
      <ChainOfThoughtContext.Provider value={chainOfThoughtContext}>
        <div
          className={cn("not-prose max-w-prose space-y-4 mb-4", className)}
          {...props}
        >
          {children}
        </div>
      </ChainOfThoughtContext.Provider>
    );
  }
);

export type ChainOfThoughtHeaderProps = ComponentProps<
  typeof CollapsibleTrigger
>;

export const ChainOfThoughtHeader = memo(
  ({ className, children, ...props }: ChainOfThoughtHeaderProps) => {
    const { isOpen, setIsOpen, isStreaming, duration } = useChainOfThought();

    const defaultLabel = isStreaming
      ? "Thinking..."
      : duration > 0
        ? `Thought for ${duration} second${duration !== 1 ? 's' : ''}`
        : "Thought for a few seconds";

    return (
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <CollapsibleTrigger
          className={cn(
            // Base styles
            "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium -ml-2",
            // Transitions
            "transition-all duration-200 ease-out",
            // Focus ring
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2",
            // Hover scale
            "hover:scale-[1.02] active:scale-[0.98]",
            // Border
            "border ",
            // State-based styles
            isStreaming
              ? "bg-purple-100 text-purple-700 border-purple-200 shadow-sm shadow-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50 dark:shadow-purple-900/20"
              : "bg-secondary text-secondary-foreground border-border shadow-sm hover:bg-accent hover:text-foreground hover:shadow-md",
            "cursor-pointer",
            className
          )}
          {...props}
        >
          <BrainIcon className={cn(
            "size-3.5 transition-transform duration-200",
            isStreaming && "animate-pulse"
          )} />
          <span className="select-none">
            {children ?? defaultLabel}
          </span>
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform duration-200 ease-out",
              isOpen ? "rotate-180" : "rotate-0"
            )}
          />
        </CollapsibleTrigger>
      </Collapsible>
    );
  }
);

export type ChainOfThoughtStepProps = ComponentProps<"div"> & {
  icon?: LucideIcon | null;
  label: ReactNode;
  description?: ReactNode;
  status?: "complete" | "active" | "pending";
};

export const ChainOfThoughtStep = memo(
  ({
    className,
    icon: Icon,
    label,
    description,
    status = "complete",
    children,
    ...props
  }: ChainOfThoughtStepProps) => {
    const statusStyles = {
      complete: "text-muted-foreground",
      active: "text-foreground",
      pending: "text-muted-foreground/50",
    };

    // Use DotIcon as default, or nothing if explicitly set to null
    const showIcon = Icon !== null;
    const IconComponent = Icon === undefined ? DotIcon : Icon;

    return (
      <div
        className={cn(
          "flex gap-2 text-sm",
          statusStyles[status],
          "fade-in-0 slide-in-from-top-2 animate-in",
          className
        )}
        {...props}
      >
        <div className="relative mt-0.5 w-4">
          {showIcon && IconComponent && (
            <IconComponent className="size-4" />
          )}
          <div className={cn(
            "-mx-px absolute bottom-0 left-1/2 w-px bg-border",
            showIcon ? "top-7" : "top-0"
          )} />
        </div>
        <div className="flex-1 space-y-2 overflow-hidden">
          <div>{label}</div>
          {description && (
            <div className="text-muted-foreground text-xs">{description}</div>
          )}
          {children}
        </div>
      </div>
    );
  }
);

export type ChainOfThoughtSearchResultsProps = ComponentProps<"div">;

export const ChainOfThoughtSearchResults = memo(
  ({ className, ...props }: ChainOfThoughtSearchResultsProps) => (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  )
);

export type ChainOfThoughtSearchResultProps = ComponentProps<typeof Badge>;

export const ChainOfThoughtSearchResult = memo(
  ({ className, children, ...props }: ChainOfThoughtSearchResultProps) => (
    <Badge
      className={cn("gap-1 px-2 py-0.5 font-normal text-xs", className)}
      variant="secondary"
      {...props}
    >
      {children}
    </Badge>
  )
);

export type ChainOfThoughtContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children?: ReactNode;
};

export const ChainOfThoughtContent = memo(
  ({ className, children, ...props }: ChainOfThoughtContentProps) => {
    const { isOpen, isStreaming } = useChainOfThought();

    // If children is a string, render it through Response for markdown support
    const content = typeof children === 'string'
      ? <Response className="first:mt-0">{children}</Response>
      : children;

    return (
      <Collapsible open={isOpen}>
        <CollapsibleContent
          className={cn(
            "mt-2 space-y-3",
            "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
            isStreaming && "animate-shimmer",
            className
          )}
          {...props}
        >
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  }
);

export type ChainOfThoughtImageProps = ComponentProps<"div"> & {
  caption?: string;
};

export const ChainOfThoughtImage = memo(
  ({ className, children, caption, ...props }: ChainOfThoughtImageProps) => (
    <div className={cn("mt-2 space-y-2", className)} {...props}>
      <div className="relative flex max-h-[22rem] items-center justify-center overflow-hidden rounded-lg bg-muted p-3">
        {children}
      </div>
      {caption && <p className="text-muted-foreground text-xs">{caption}</p>}
    </div>
  )
);

ChainOfThought.displayName = "ChainOfThought";
ChainOfThoughtHeader.displayName = "ChainOfThoughtHeader";
ChainOfThoughtStep.displayName = "ChainOfThoughtStep";
ChainOfThoughtSearchResults.displayName = "ChainOfThoughtSearchResults";
ChainOfThoughtSearchResult.displayName = "ChainOfThoughtSearchResult";
ChainOfThoughtContent.displayName = "ChainOfThoughtContent";
ChainOfThoughtImage.displayName = "ChainOfThoughtImage";
