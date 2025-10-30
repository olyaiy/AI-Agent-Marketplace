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
        // List styling
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul]:space-y-1',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_ol]:space-y-1',
        '[&_li]:text-sm',
        // Nested lists
        '[&_ul_ul]:list-[circle] [&_ul_ul]:my-1',
        '[&_ol_ol]:list-[lower-alpha] [&_ol_ol]:my-1',
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = 'Response';
