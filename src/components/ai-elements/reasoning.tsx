import { useControllableState } from '@radix-ui/react-use-controllable-state';
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
} from './chain-of-thought';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';
import React, { createContext, memo, useContext, useEffect, useState } from 'react';

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning');
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof ChainOfThought> & {
  isStreaming?: boolean;
  duration?: number;
};

const AUTO_CLOSE_DELAY = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = false,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: 0,
    });

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
    }, [isStreaming, startTime, setDuration]);

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

    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen);
    };

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen: isOpen ?? false, setIsOpen: handleOpenChange, duration: duration ?? 0 }}
      >
        <ChainOfThought
          className={className}
          open={isOpen}
          onOpenChange={handleOpenChange}
          {...props}
        >
          {children}
        </ChainOfThought>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<typeof ChainOfThoughtHeader>;

export const ReasoningTrigger = memo(
  ({ className, children, ...props }: ReasoningTriggerProps) => {
    const { isStreaming, duration } = useReasoning();

    return (
      <ChainOfThoughtHeader
        className={cn('text-sm', className)}
        {...props}
      >
        {children ?? (
          <>
            {isStreaming || duration === 0 ? (
              <span>Thinking...</span>
            ) : (
              <span>Thought for {duration} seconds</span>
            )}
          </>
        )}
      </ChainOfThoughtHeader>
    );
  }
);

export type ReasoningContentProps = ComponentProps<
  typeof ChainOfThoughtContent
> & {
  children?: string;
};

/**
 * Lightweight text formatter for reasoning content.
 * Handles **bold** and newlines without heavy markdown parsing.
 * Optimized for streaming performance.
 */
const formatReasoningText = (text: string): React.ReactNode[] => {
  if (!text) return [];

  // First, normalize escaped newlines (\n as literal characters) to actual newlines
  const normalizedText = text.replace(/\\n/g, '\n');

  // Split by newlines first
  const lines = normalizedText.split('\n');

  return lines.map((line, lineIndex) => {
    // Parse **bold** patterns within each line
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;
    let partIndex = 0;

    while ((match = boldRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`${lineIndex}-${partIndex++}`}>
            {line.slice(lastIndex, match.index)}
          </span>
        );
      }
      // Add the bold text
      parts.push(
        <strong key={`${lineIndex}-${partIndex++}`} className="font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last match
    if (lastIndex < line.length) {
      parts.push(
        <span key={`${lineIndex}-${partIndex++}`}>
          {line.slice(lastIndex)}
        </span>
      );
    }

    // If no bold patterns found, just use the line as-is
    if (parts.length === 0 && line.length > 0) {
      parts.push(<span key={`${lineIndex}-0`}>{line}</span>);
    }

    // Wrap in a fragment and add a <br /> for each line except the last
    return (
      <span key={lineIndex}>
        {parts}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
};

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => {
    const { isStreaming } = useReasoning();

    return (
      <ChainOfThoughtContent
        className={cn(isStreaming && 'animate-shimmer', className)}
        {...props}
      >
        <div className="text-sm leading-relaxed text-muted-foreground">
          {formatReasoningText(children ?? '')}
        </div>
      </ChainOfThoughtContent>
    );
  }
);

Reasoning.displayName = 'Reasoning';
ReasoningTrigger.displayName = 'ReasoningTrigger';
ReasoningContent.displayName = 'ReasoningContent';
