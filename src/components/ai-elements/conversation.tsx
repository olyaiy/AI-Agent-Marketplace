'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Virtuoso,
  type VirtuosoHandle,
  type VirtuosoProps,
} from 'react-virtuoso';
import { AnimatePresence, motion } from 'motion/react';

type ConversationContextValue = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
  itemCount: number;
  lastSeenCount: number;
};

const ConversationContext = createContext<ConversationContextValue | null>(
  null
);

export const useConversationContext = () => useContext(ConversationContext);

type ConversationProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscan?: { top?: number; bottom?: number };
  virtuosoProps?: Omit<
    VirtuosoProps<T, unknown>,
    'data' | 'itemContent' | 'atBottomStateChange' | 'followOutput'
  >;
  children?: ReactNode;
};

export const Conversation = <T,>({
  items,
  renderItem,
  className,
  overscan,
  virtuosoProps,
  children,
}: ConversationProps<T>) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastSeenCount, setLastSeenCount] = useState(items.length);

  // Track the last seen count when user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      setLastSeenCount(items.length);
    }
  }, [isAtBottom, items.length]);

  const scrollToBottom = useCallback(() => {
    if (!virtuosoRef.current) return;
    const lastIndex = Math.max(0, items.length - 1);
    virtuosoRef.current.scrollToIndex({
      index: lastIndex,
      align: 'end',
      behavior: 'smooth',
    });
  }, [items.length]);

  const contextValue = useMemo(
    () => ({ isAtBottom, scrollToBottom, itemCount: items.length, lastSeenCount }),
    [isAtBottom, scrollToBottom, items.length, lastSeenCount]
  );

  return (
    <ConversationContext.Provider value={contextValue}>
      <div className={cn('relative h-full', className)}>
        <Virtuoso
          ref={virtuosoRef}
          data={items}
          className="h-full"
          followOutput={isAtBottom ? 'smooth' : false}
          atBottomStateChange={setIsAtBottom}
          increaseViewportBy={{
            top: overscan?.top ?? 200,
            bottom: overscan?.bottom ?? 400,
          }}
          itemContent={(index, item) => renderItem(item, index)}
          {...virtuosoProps}
        />
        {children}
      </div>
    </ConversationContext.Provider>
  );
};

export type ConversationScrollButtonProps = ComponentProps<typeof Button> & {
  showNewMessageIndicator?: boolean;
};

export const ConversationScrollButton = ({
  className,
  showNewMessageIndicator = true,
  ...props
}: ConversationScrollButtonProps) => {
  const context = useConversationContext();
  const isAtBottom = context?.isAtBottom ?? true;
  const itemCount = context?.itemCount ?? 0;
  const lastSeenCount = context?.lastSeenCount ?? 0;
  const newMessageCount = Math.max(0, itemCount - lastSeenCount);

  const handleScrollToBottom = useCallback(() => {
    context?.scrollToBottom();
  }, [context]);

  return (
    <AnimatePresence mode="wait">
      {!isAtBottom && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="absolute bottom-4 left-[50%] z-20"
          style={{ transform: 'translateX(-50%)' }}
        >
          <Button
            className={cn(
              // Base styles
              'relative rounded-full shadow-lg',
              // Glassmorphism effect
              'bg-background/80 backdrop-blur-md border border-border/50',
              // Subtle glow effect
              'shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.05)]',
              // Hover states with smooth transition
              'hover:bg-background/95 hover:border-border hover:shadow-xl',
              'hover:scale-105 active:scale-95',
              // Focus styles
              'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
              // Transition
              'transition-all duration-200 ease-out',
              className
            )}
            onClick={handleScrollToBottom}
            size="icon"
            type="button"
            variant="outline"
            aria-label={
              newMessageCount > 0
                ? `Scroll to bottom (${newMessageCount} new message${newMessageCount > 1 ? 's' : ''})`
                : 'Scroll to bottom'
            }
            {...props}
          >
            {/* Animated arrow icon */}
            <motion.div
              animate={{ y: [0, 2, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <ChevronDown className="size-5 text-foreground/80" />
            </motion.div>

            {/* New message indicator badge */}
            {showNewMessageIndicator && newMessageCount > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={cn(
                  'absolute -top-2 -right-2',
                  'flex items-center justify-center',
                  'min-w-[20px] h-5 px-1.5',
                  'text-[11px] font-semibold',
                  'bg-primary text-primary-foreground',
                  'rounded-full',
                  'shadow-md',
                  // Pulse animation for new messages
                  'animate-pulse'
                )}
              >
                {newMessageCount > 99 ? '99+' : newMessageCount}
              </motion.span>
            )}
          </Button>

          {/* Subtle ring pulse effect when there are new messages */}
          {showNewMessageIndicator && newMessageCount > 0 && (
            <motion.div
              className="absolute inset-0 -z-10 rounded-full"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              style={{
                background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
