'use client';

import { cn } from '@/lib/utils';
import { memo } from 'react';
import { Streamdown } from 'streamdown';
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationSource
} from '@/components/ai-elements/inline-citation';

type ResponseProps = {
  children?: string;
  className?: string;
  sources?: { title: string; url: string }[];
  isAnimating?: boolean;
};

export const Response = memo(
  ({ className, children, sources = [], isAnimating = false }: ResponseProps) => {
    return (
      <div className={cn('size-full max-w-none', className)}>
        <Streamdown
          isAnimating={isAnimating}
          components={{
            // Override links for citation feature
            a: ({ href, children: linkChildren }) => {
              const url = href || '#';
              const linkText = String(linkChildren);
              const source = sources.find((s) => s.url === url);
              const title = source?.title || linkText;

              return (
                <>
                  {/* User message link - full styled link with accent color */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden group-[.is-user]:inline text-sky-600 dark:text-[#8f2f1a] hover:underline underline-offset-2 font-medium"
                  >
                    {linkText}
                  </a>
                  {/* Assistant message link - pill citation badge */}
                  <span className="group-[.is-user]:hidden">
                    <InlineCitation>
                      <InlineCitationCard>
                        <InlineCitationCardTrigger sources={[url]} />
                        <InlineCitationCardBody>
                          <div className="p-4 w-[300px]">
                            <InlineCitationSource title={title} url={url} />
                          </div>
                        </InlineCitationCardBody>
                      </InlineCitationCard>
                    </InlineCitation>
                  </span>
                </>
              );
            },
          }}
        >
          {children}
        </Streamdown>
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.isAnimating === nextProps.isAnimating
);

Response.displayName = 'Response';
