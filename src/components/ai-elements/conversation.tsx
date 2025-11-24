'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowDownIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Virtuoso,
  type VirtuosoHandle,
  type VirtuosoProps,
} from 'react-virtuoso';

type ConversationContextValue = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
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
    () => ({ isAtBottom, scrollToBottom }),
    [isAtBottom, scrollToBottom]
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

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const context = useConversationContext();
  const isAtBottom = context?.isAtBottom ?? true;

  const handleScrollToBottom = useCallback(() => {
    context?.scrollToBottom();
  }, [context]);

  return !isAtBottom ? (
    <Button
      className={cn(
        'absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full',
        className
      )}
      onClick={handleScrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  ) : null;
};
