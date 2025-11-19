'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { BookIcon, ChevronDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

export type SourcesProps = ComponentProps<'div'>;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    className={cn('not-prose mb-4 text-primary text-xs', className)}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  sources?: { url: string }[];
};

export const SourcesTrigger = ({
  className,
  sources = [],
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn('flex items-center gap-2 group cursor-pointer', className)}
    {...props}
  >
    {children ?? (
      <>
        <div className="flex items-center -space-x-2 overflow-hidden">
          {sources.slice(0, 3).map((source, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={`https://www.google.com/s2/favicons?sz=128&domain_url=${source.url}`}
              alt=""
              className="relative z-10 inline-block size-4 rounded-full object-contain"
            />
          ))}
        </div>
        <p className="font-medium group-hover:text-foreground transition-colors">
          {sources.length} {sources.length === 1 ? 'source' : 'sources'}
        </p>
        <ChevronDownIcon className="h-4 w-4 transition-transform duration-300 group-data-[state=open]:rotate-180" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      'mt-3 flex w-fit flex-col gap-2',
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className
    )}
    {...props}
  />
);

export type SourceProps = ComponentProps<'a'>;

export const Source = ({ href, title, children, ...props }: SourceProps) => {
  const faviconUrl = href ? `https://www.google.com/s2/favicons?sz=128&domain_url=${href}` : null;

  return (
    <a
      className="flex items-start gap-2 group max-w-[300px]"
      href={href}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children ?? (
        <>
          <div className="mt-0.5 shrink-0">
            {faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={faviconUrl}
                alt=""
                className="h-4 w-4 rounded-sm object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <BookIcon className={cn("h-4 w-4 text-muted-foreground", faviconUrl && "hidden")} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="block font-medium truncate text-sm hover:underline underline-offset-4 leading-tight">
              {title}
            </span>
            {href && (
              <span className="text-[10px] text-muted-foreground truncate leading-tight opacity-80">
                {href}
              </span>
            )}
          </div>
        </>
      )}
    </a>
  );
};
