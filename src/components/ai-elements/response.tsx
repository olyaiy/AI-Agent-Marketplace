'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationSource
} from '@/components/ai-elements/inline-citation';
import { CodeBlock, CodeBlockCopyButton } from '@/components/ai-elements/code-block';

type ResponseProps = Omit<ComponentProps<typeof ReactMarkdown>, 'children' | 'className'> & {
  children?: string;
  className?: string;
  sources?: { title: string; url: string }[];
};

export const Response = memo(
  ({ className, children, sources = [], ...props }: ResponseProps) => {
    // Escape dollar signs to prevent LaTeX math rendering
    const escapedChildren = useMemo(() => {
      if (typeof children !== 'string') return children;
      return children.replace(/\$/g, '\\$');
    }, [children]);

    return (
      <div className={cn('size-full whitespace-pre-wrap', className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ className, ...props }) => (
              <h1 className={cn('text-2xl font-bold mt-6 mb-4', className)} {...props} />
            ),
            h2: ({ className, ...props }) => (
              <h2 className={cn('text-xl font-bold mt-5 mb-3', className)} {...props} />
            ),
            h3: ({ className, ...props }) => (
              <h3 className={cn('text-lg font-semibold mt-4 mb-2', className)} {...props} />
            ),
            h4: ({ className, ...props }) => (
              <h4 className={cn('text-base font-semibold mt-3 mb-2', className)} {...props} />
            ),
            h5: ({ className, ...props }) => (
              <h5 className={cn('text-sm font-semibold mt-3 mb-2', className)} {...props} />
            ),
            h6: ({ className, ...props }) => (
              <h6 className={cn('text-sm font-medium mt-3 mb-2', className)} {...props} />
            ),
            p: ({ className, ...props }) => (
              <p
                className={cn('text-sm leading-relaxed my-0 whitespace-pre-wrap', className)}
                {...props}
              />
            ),
            ul: ({ className, ...props }) => (
              <ul className={cn('list-disc pl-6 whitespace-normal', className)} {...props} />
            ),
            ol: ({ className, ...props }) => (
              <ol className={cn('list-decimal pl-6 whitespace-normal', className)} {...props} />
            ),
            li: ({ className, ...props }) => (
              <li
                className={cn('text-sm leading-relaxed whitespace-normal', className)}
                {...props}
              />
            ),
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              const isCodeBlock = match || (children && String(children).includes('\n'));

              if (isCodeBlock) {
                return (
                  <CodeBlock
                    language={match?.[1] || 'text'}
                    code={String(children).replace(/\n$/, '')}
                    className="my-3"
                    {...props}
                  >
                    <CodeBlockCopyButton />
                  </CodeBlock>
                );
              }

              return (
                <code
                  className={cn(
                    'text-xs bg-muted px-1.5 py-0.5 rounded font-mono',
                    className
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => <>{children}</>,
            a: ({ href, children }) => {
              const url = href || '#';
              const linkText = String(children);
              const source = sources.find((s) => s.url === url);
              const title = source?.title || linkText;

              return (
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
              );
            },
            blockquote: ({ className, ...props }) => (
              <blockquote
                className={cn(
                  'border-l-4 border-muted-foreground/20 pl-4 py-1 my-3 italic text-muted-foreground',
                  className
                )}
                {...props}
              />
            ),
            hr: ({ className, ...props }) => (
              <hr
                className={cn('border-border my-1', className)}
                {...props}
              />
            ),
            table: ({ className, ...props }) => (
              <table
                className={cn('w-full my-3 border-collapse', className)}
                {...props}
              />
            ),
            th: ({ className, ...props }) => (
              <th
                className={cn(
                  'border border-border px-3 py-2 bg-muted font-semibold text-left text-sm',
                  className
                )}
                {...props}
              />
            ),
            td: ({ className, ...props }) => (
              <td
                className={cn(
                  'border border-border px-3 py-2 text-sm',
                  className
                )}
                {...props}
              />
            ),
            strong: ({ className, ...props }) => (
              <strong
                className={cn('font-semibold text-[1.1em]', className)}
                {...props}
              />
            ),
            em: ({ className, ...props }) => (
              <em
                className={cn('italic', className)}
                {...props}
              />
            ),
          }}
          {...props}
        >
          {escapedChildren as string}
        </ReactMarkdown>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = 'Response';
