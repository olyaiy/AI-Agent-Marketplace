import { cn } from '@/lib/utils';
import type { Experimental_GeneratedImage } from 'ai';
import NextImage from 'next/image';
import type { ComponentProps } from 'react';

type NextImageBaseProps = Omit<
  ComponentProps<typeof NextImage>,
  'src' | 'alt' | 'className' | 'width' | 'height' | 'fill'
>;

export type ImageProps = Experimental_GeneratedImage &
  NextImageBaseProps & {
    className?: string;
    alt?: string;
    width?: number;
    height?: number;
    fill?: boolean;
  };

export const Image = ({
  base64,
  mediaType,
  className,
  alt,
  width,
  height,
  fill,
  ...props
}: ImageProps) => (
  <NextImage
    {...props}
    alt={alt ?? ''}
    className={cn(
      'h-auto max-w-full overflow-hidden rounded-md',
      className
    )}
    src={`data:${mediaType};base64,${base64}`}
    width={fill ? undefined : width ?? 512}
    height={fill ? undefined : height ?? 512}
    fill={fill}
    unoptimized
  />
);
