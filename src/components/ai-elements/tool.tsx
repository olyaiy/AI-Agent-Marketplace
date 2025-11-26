'use client';

import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { ToolUIPart } from 'ai';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
  GlobeIcon,
  FileTextIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { memo, useMemo } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { CodeBlock } from './code-block';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = memo(function Tool({ className, ...props }: ToolProps) {
  return (
    <Collapsible
      className={cn('group not-prose mb-4 w-full rounded-md border', className)}
      {...props}
    />
  );
});

export type ToolHeaderProps = {
  type: string;
  state: ToolUIPart['state'];
  className?: string;
  displayName?: string;
  hideStatus?: boolean;
  icon?: ReactNode;
  preview?: string;
};

const stringifySafe = (value: unknown) => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const compactString = (value: string, maxLength = 4000) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n… truncated ${value.length - maxLength} characters`;
};

const getStatusBadge = (status: ToolUIPart['state']) => {
  const labels = {
    'input-streaming': 'Pending',
    'input-available': 'Running',
    'output-available': 'Completed',
    'output-error': 'Error',
  } as const;

  const icons = {
    'input-streaming': <CircleIcon className="size-4" />,
    'input-available': <ClockIcon className="size-4 animate-pulse" />,
    'output-available': <CheckCircleIcon className="size-4 text-green-600" />,
    'output-error': <XCircleIcon className="size-4 text-red-600" />,
  } as const;

  return (
    <Badge className="rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = memo(function ToolHeader({
  className,
  type,
  state,
  displayName,
  hideStatus,
  icon,
  preview,
  ...props
}: ToolHeaderProps) {
  return (
    <CollapsibleTrigger
      className={cn(
        'flex w-full items-center justify-between gap-4 p-3',
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {icon ?? <WrenchIcon className="size-4 text-muted-foreground shrink-0" />}
          <span className="font-medium text-sm shrink-0">{displayName ?? type}</span>
          {!hideStatus && getStatusBadge(state)}
        </div>
        {preview && (
          <span className="text-xs text-muted-foreground truncate pl-6" title={preview}>
            {preview}
          </span>
        )}
      </div>
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 shrink-0" />
    </CollapsibleTrigger>
  );
});

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input'];
  renderMode?: 'plain' | 'code';
};

export const ToolInput = memo(function ToolInput({
  className,
  input,
  renderMode = 'code',
  ...props
}: ToolInputProps) {
  const inputString = useMemo(() => stringifySafe(input), [input]);
  const previewString = useMemo(
    () => compactString(inputString, 4000),
    [inputString]
  );

  if (renderMode === 'plain') {
    return (
      <div className={cn('space-y-2 overflow-hidden p-4', className)} {...props}>
        <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Parameters
        </h4>
        <pre className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed overflow-auto">
          {previewString}
        </pre>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 overflow-hidden p-4', className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Parameters
      </h4>
      <div className="rounded-md bg-muted/50">
        <CodeBlock code={inputString} language="json" />
      </div>
    </div>
  );
});

export type ToolOutputProps = ComponentProps<'div'> & {
  output?: ReactNode;
  outputText?: string;
  errorText: ToolUIPart['errorText'];
  renderMode?: 'plain' | 'code';
};

export const ToolOutput = memo(function ToolOutput({
  className,
  output,
  outputText,
  errorText,
  renderMode = 'code',
  ...props
}: ToolOutputProps) {
  const textContent = useMemo(
    () => (outputText ? compactString(outputText, 8000) : ''),
    [outputText]
  );

  const renderedContent = useMemo(() => {
    if (output) return output;
    if (!textContent) return null;
    if (renderMode === 'plain') {
      return (
        <pre className="whitespace-pre-wrap break-words p-3 text-xs leading-relaxed">
          {textContent}
        </pre>
      );
    }
    return <CodeBlock code={textContent} language="json" />;
  }, [output, renderMode, textContent]);

  if (!(renderedContent || errorText)) {
    return null;
  }

  return (
    <div className={cn('space-y-2 p-4', className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? 'Error' : 'Result'}
      </h4>
      <div
        className={cn(
          'overflow-x-auto rounded-md text-xs [&_table]:w-full',
          errorText
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted/50 text-foreground'
        )}
      >
        {errorText && <div>{errorText}</div>}
        {renderedContent && <div>{renderedContent}</div>}
      </div>
    </div>
  );
});
