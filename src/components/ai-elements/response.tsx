'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo, useDeferredValue, useMemo } from 'react';
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

// Normalize list items that were split across lines like:
// "1.\nItem one" -> "1. Item one"
// We only touch content outside code fences to avoid mangling examples.
const normalizeLooseOrderedLists = (input: string): string => {
  const fenceRegex = /```[\s\S]*?```/g;

  const normalizeSegment = (segment: string): string => {
    const lines = segment.split('\n');
    const output: string[] = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const next = lines[i + 1];

      const isNumberMarkerOnly = /^\s*\d+\.\s*$/.test(line);
      const nextIsNewItem = next ? /^\s*\d+\.\s+/.test(next) : false;

      if (isNumberMarkerOnly && next && !nextIsNewItem) {
        output.push(`${line.trimEnd()} ${next.trimStart()}`);
        i += 1; // Skip the line we just consumed
        continue;
      }

      output.push(line);
    }

    return output.join('\n');
  };

  let cursor = 0;
  let normalized = '';
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(input)) !== null) {
    normalized += normalizeSegment(input.slice(cursor, match.index));
    normalized += match[0]; // Keep the fenced block as-is
    cursor = fenceRegex.lastIndex;
  }

  normalized += normalizeSegment(input.slice(cursor));
  return normalized;
};

export const Response = memo(
  ({ className, children, sources = [], ...props }: ResponseProps) => {
    // Escape dollar signs to prevent LaTeX math rendering
    const escapedChildren = useMemo(() => {
      if (typeof children !== 'string') return children;
      return children.replace(/\$/g, '\\$');
    }, [children]);
    const deferredContent = useDeferredValue(escapedChildren);
    const normalizedContent = useMemo(() => {
      if (typeof deferredContent !== 'string') return deferredContent;
      return normalizeLooseOrderedLists(deferredContent);
    }, [deferredContent]);

    return (
      <div className={cn('size-full max-w-none', className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ className, ...props }) => (
              <h1 className={cn('text-2xl md:text-3xl font-bold mt-8 mb-4 text-pretty', className)} {...props} />
            ),
            h2: ({ className, ...props }) => (
              <h2 className={cn('text-xl md:text-2xl font-semibold mt-8 mb-4 text-pretty', className)} {...props} />
            ),
            h3: ({ className, ...props }) => (
              <h3 className={cn('text-lg md:text-xl font-semibold mt-6 mb-3 text-pretty', className)} {...props} />
            ),
            h4: ({ className, ...props }) => (
              <h4 className={cn('text-base md:text-lg font-medium mt-6 mb-3 text-pretty', className)} {...props} />
            ),
            h5: ({ className, ...props }) => (
              <h5 className={cn('text-sm md:text-base font-medium mt-4 mb-2 text-pretty', className)} {...props} />
            ),
            h6: ({ className, ...props }) => (
              <h6 className={cn('text-sm font-medium mt-4 mb-2 opacity-70 text-pretty', className)} {...props} />
            ),
            p: ({ className, ...props }) => (
              <p
                className={cn('text-[15px] md:text-base leading-7 mb-4 last:mb-0 text-pretty', className)}
                {...props}
              />
            ),
            ul: ({ className, ...props }) => (
              <ul className={cn('list-disc list-outside ml-5 mb-4', className)} {...props} />
            ),
            ol: ({ className, ...props }) => (
              <ol className={cn('list-decimal list-outside ml-5 mb-4', className)} {...props} />
            ),
            li: ({ className, ...props }) => (
              <li
                className={cn(
                  'text-[15px] md:text-base leading-7 pl-1 mb-1',
                  className
                )}
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
                    className="my-4 rounded-lg border shadow-sm"
                    {...props}
                  >
                    <CodeBlockCopyButton />
                  </CodeBlock>
                );
              }

              return (
                <code
                  className={cn(
                    'text-[0.9em] bg-muted/50 text-foreground/80 px-1.5 py-0.5 rounded font-mono font-medium',
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
                <>
                  {/* User message link - full styled link with accent color */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden group-[.is-user]:inline text-sky-600 dark:text-accent hover:underline underline-offset-2 font-medium"
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
            blockquote: ({ className, ...props }) => (
              <blockquote
                className={cn(
                  'border-l-4 border-primary/20 pl-4 py-1 my-4 italic opacity-80',
                  className
                )}
                {...props}
              />
            ),
            hr: ({ className, ...props }) => (
              <hr
                className={cn('border-border/50 my-8', className)}
                {...props}
              />
            ),
            table: ({ className, ...props }) => (
              <div className="my-4 w-full overflow-y-auto rounded-lg border border-border">
                <table
                  className={cn('w-full border-collapse text-sm', className)}
                  {...props}
                />
              </div>
            ),
            thead: ({ className, ...props }) => (
              <thead className={cn('bg-muted/50 border-b border-border', className)} {...props} />
            ),
            th: ({ className, ...props }) => (
              <th
                className={cn(
                  'px-4 py-3 font-semibold text-left align-middle opacity-80',
                  className
                )}
                {...props}
              />
            ),
            tr: ({ className, ...props }) => (
              <tr className={cn('border-b border-border/50 hover:bg-muted/20 transition-colors', className)} {...props} />
            ),
            td: ({ className, ...props }) => (
              <td
                className={cn(
                  'px-4 py-3 align-middle',
                  className
                )}
                {...props}
              />
            ),
            strong: ({ className, ...props }) => (
              <strong
                className={cn('font-semibold', className)}
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
          {normalizedContent as string}
        </ReactMarkdown>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = 'Response';
