'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';

type ResponseProps = Omit<ComponentProps<typeof Streamdown>, 'children'> & {
  children?: string;
};

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        // Headings
        '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4',
        '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3',
        '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2',
        '[&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-2',
        '[&_h5]:text-sm [&_h5]:font-semibold [&_h5]:mt-3 [&_h5]:mb-2',
        '[&_h6]:text-sm [&_h6]:font-medium [&_h6]:mt-3 [&_h6]:mb-2',
        // Paragraphs
        '[&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-2',
        // Lists
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul]:space-y-1',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_ol]:space-y-1',
        '[&_li]:text-sm [&_li]:leading-relaxed',
        // Nested lists
        '[&_ul_ul]:list-[circle] [&_ul_ul]:my-1',
        '[&_ol_ol]:list-[lower-alpha] [&_ol_ol]:my-1',
        // Code
        '[&_code]:text-xs [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono',
        '[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-3 [&_pre]:overflow-x-auto',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs',
        // Links
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80 [&_a]:transition-colors',
        // Blockquotes
        '[&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/20 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
        // Horizontal rules
        '[&_hr]:border-border [&_hr]:my-4',
        // Tables
        '[&_table]:w-full [&_table]:my-3 [&_table]:border-collapse',
        '[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:font-semibold [&_th]:text-left [&_th]:text-sm',
        '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm',
        // Strong and emphasis
        '[&_strong]:font-semibold',
        '[&_em]:italic',
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = 'Response';
