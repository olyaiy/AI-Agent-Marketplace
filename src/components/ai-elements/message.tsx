import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';
import type { ComponentProps, HTMLAttributes } from 'react';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage['role'];
};

export const Message = ({ className, from, ...props }: MessageProps) => {
  const isUser = from === 'user';
  const widthClasses = isUser
    ? '[&>div]:max-w-[85%] md:[&>div]:max-w-[80%]'
    : '[&>div]:w-full [&>div]:max-w-[800px]';

  return (
    <div
      className={cn(
        'group flex w-full items-end justify-end gap-1 md:gap-2 py-0',
        isUser ? 'is-user' : 'is-assistant flex-row-reverse justify-end',
        widthClasses,
        className
      )}
      {...props}
    />
  );
};

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      'flex flex-col gap-2 overflow-hidden text-[15px] md:text-base',
      // User message styling - glassmorphism bubble
      'group-[.is-user]:bg-primary/85 group-[.is-user]:backdrop-blur-sm',
      'group-[.is-user]:text-primary-foreground',
      'group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-sm',
      'group-[.is-user]:px-4 group-[.is-user]:py-2.5',
      'group-[.is-user]:border group-[.is-user]:border-primary-foreground/10',
      'group-[.is-user]:shadow-lg group-[.is-user]:shadow-primary/25',
      // Assistant message styling
      'group-[.is-assistant]:text-foreground',
      'group-[.is-assistant]:px-2 group-[.is-assistant]:py-2',
      className
    )}
    {...props}
  >
    <div className="is-user:dark">{children}</div>
  </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
  src: string;
  name?: string;
};

export const MessageAvatar = ({
  src,
  name,
  className,
  ...props
}: MessageAvatarProps) => (
  <Avatar
    className={cn('size-6 md:size-8 ring ring-1 ring-border', className)}
    {...props}
  >
    <AvatarImage alt="" className="mt-0 mb-0" src={src} />
    <AvatarFallback>{name?.slice(0, 2) || 'ME'}</AvatarFallback>
  </Avatar>
);
