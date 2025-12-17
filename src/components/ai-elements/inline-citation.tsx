'use client';

import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import {
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export type InlineCitationProps = ComponentProps<'span'>;

export const InlineCitation = ({
  className,
  ...props
}: InlineCitationProps) => (
  <span
    className={cn('group inline items-center gap-1', className)}
    {...props}
  />
);

export type InlineCitationTextProps = ComponentProps<'span'>;

export const InlineCitationText = ({
  className,
  ...props
}: InlineCitationTextProps) => (
  <span
    className={cn('transition-colors group-hover:bg-accent', className)}
    {...props}
  />
);

export type InlineCitationCardProps = ComponentProps<typeof HoverCard>;

export const InlineCitationCard = (props: InlineCitationCardProps) => (
  <HoverCard closeDelay={0} openDelay={0} {...props} />
);

export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
  sources: string[];
};

export const InlineCitationCardTrigger = ({
  sources,
  className,
  ...props
}: InlineCitationCardTriggerProps) => {
  let hostname = 'unknown';
  if (sources.length > 0) {
    try {
      hostname = new URL(sources[0]).hostname;
    } catch {
      hostname = sources[0];
    }
  }

  return (
    <HoverCardTrigger asChild>
      <Badge
        variant="outline"
        className={cn(
          'ml-1 inline-flex h-5 items-center rounded-full px-1.5 py-0 align-text-bottom text-[10px] font-normal cursor-pointer transition-colors',
          // Default styling for assistant messages
          'text-muted-foreground hover:bg-accent hover:text-foreground',
          // Inverted styling for user messages (inside .is-user parent)
          'group-[.is-user]:bg-primary-foreground/20 group-[.is-user]:text-primary-foreground group-[.is-user]:border-primary-foreground/30 group-[.is-user]:hover:bg-primary-foreground/30',
          className
        )}
        {...props}
      >
        {sources.length ? (
          <span className="truncate max-w-[150px]">
            {hostname}{' '}
            {sources.length > 1 && `+${sources.length - 1}`}
          </span>
        ) : (
          'unknown'
        )}
      </Badge>
    </HoverCardTrigger>
  );
};

export type InlineCitationCardBodyProps = ComponentProps<'div'>;

export const InlineCitationCardBody = ({
  className,
  ...props
}: InlineCitationCardBodyProps) => (
  <HoverCardContent className={cn('relative w-80 p-0', className)} {...props} />
);

const CarouselApiContext = createContext<CarouselApi | undefined>(undefined);

const useCarouselApi = () => {
  const context = useContext(CarouselApiContext);
  return context;
};

export type InlineCitationCarouselProps = ComponentProps<typeof Carousel>;

export const InlineCitationCarousel = ({
  className,
  children,
  ...props
}: InlineCitationCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();

  return (
    <CarouselApiContext.Provider value={api}>
      <Carousel className={cn('w-full', className)} setApi={setApi} {...props}>
        {children}
      </Carousel>
    </CarouselApiContext.Provider>
  );
};

export type InlineCitationCarouselContentProps = ComponentProps<'div'>;

export const InlineCitationCarouselContent = (
  props: InlineCitationCarouselContentProps
) => <CarouselContent {...props} />;

export type InlineCitationCarouselItemProps = ComponentProps<'div'>;

export const InlineCitationCarouselItem = ({
  className,
  ...props
}: InlineCitationCarouselItemProps) => (
  <CarouselItem
    className={cn('w-full space-y-2 p-4 pl-8', className)}
    {...props}
  />
);

export type InlineCitationCarouselHeaderProps = ComponentProps<'div'>;

export const InlineCitationCarouselHeader = ({
  className,
  ...props
}: InlineCitationCarouselHeaderProps) => (
  <div
    className={cn(
      'flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2',
      className
    )}
    {...props}
  />
);

export type InlineCitationCarouselIndexProps = ComponentProps<'div'>;

export const InlineCitationCarouselIndex = ({
  children,
  className,
  ...props
}: InlineCitationCarouselIndexProps) => {
  const api = useCarouselApi();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div
      className={cn(
        'flex flex-1 items-center justify-end px-3 py-1 text-muted-foreground text-xs',
        className
      )}
      {...props}
    >
      {children ?? `${current}/${count}`}
    </div>
  );
};

export type InlineCitationCarouselPrevProps = ComponentProps<'button'>;

export const InlineCitationCarouselPrev = ({
  className,
  ...props
}: InlineCitationCarouselPrevProps) => {
  const api = useCarouselApi();

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollPrev();
    }
  }, [api]);

  return (
    <button
      aria-label="Previous"
      className={cn('shrink-0', className)}
      onClick={handleClick}
      type="button"
      {...props}
    >
      <ArrowLeftIcon className="size-4 text-muted-foreground" />
    </button>
  );
};

export type InlineCitationCarouselNextProps = ComponentProps<'button'>;

export const InlineCitationCarouselNext = ({
  className,
  ...props
}: InlineCitationCarouselNextProps) => {
  const api = useCarouselApi();

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollNext();
    }
  }, [api]);

  return (
    <button
      aria-label="Next"
      className={cn('shrink-0', className)}
      onClick={handleClick}
      type="button"
      {...props}
    >
      <ArrowRightIcon className="size-4 text-muted-foreground" />
    </button>
  );
};

export type InlineCitationSourceProps = ComponentProps<'div'> & {
  title?: string;
  url?: string;
  description?: string;
};

export const InlineCitationSource = ({
  title,
  url,
  description,
  className,
  children,
  ...props
}: InlineCitationSourceProps) => {
  let hostname = '';
  try {
    if (url) hostname = new URL(url).hostname;
  } catch { /* ignore */ }

  const faviconUrl = url ? `https://www.google.com/s2/favicons?sz=128&domain_url=${url}` : null;

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {faviconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={faviconUrl} alt="" className="size-4 rounded-sm" />
        ) : (
          <div className="size-4 rounded-sm bg-muted" />
        )}
        <span className="text-xs font-medium">{hostname}</span>
      </div>

      {title && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sm leading-tight line-clamp-2 hover:underline decoration-primary/30 underline-offset-4 transition-all text-foreground"
        >
          {title}
        </a>
      )}

      {description && (
        <p className="line-clamp-3 text-muted-foreground text-xs leading-relaxed">
          {description}
        </p>
      )}

      {children}
    </div>
  );
};

export type InlineCitationQuoteProps = ComponentProps<'blockquote'>;

export const InlineCitationQuote = ({
  children,
  className,
  ...props
}: InlineCitationQuoteProps) => (
  <blockquote
    className={cn(
      'border-muted border-l-2 pl-3 text-muted-foreground text-sm italic',
      className
    )}
    {...props}
  >
    {children}
  </blockquote>
);
