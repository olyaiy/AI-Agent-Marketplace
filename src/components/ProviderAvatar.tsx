import React from 'react';
import { PROVIDER_ICON_MAP } from '@/lib/model-display';
import { Bot } from 'lucide-react';

type IconLike = React.ComponentType<{ size?: number; className?: string }> & { Avatar?: React.ComponentType<{ size?: number; className?: string }> };

export function ProviderAvatar({ providerSlug, size = 18, className }: { providerSlug: string | null; size?: number; className?: string }) {
  const slug = providerSlug || '';
  const IconObj = PROVIDER_ICON_MAP[slug];

  if (!IconObj) {
    // Fallback: show a gradient circle with the first letter or a generic bot icon
    const letter = slug ? slug.charAt(0).toUpperCase() : '';
    const iconSize = Math.max(size * 0.5, 10);

    return (
      <div
        className={`rounded-lg bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/10 flex items-center justify-center shrink-0 ${className || ''}`}
        style={{ width: size, height: size }}
      >
        {letter ? (
          <span
            className="font-semibold text-muted-foreground"
            style={{ fontSize: iconSize }}
          >
            {letter}
          </span>
        ) : (
          <Bot className="text-muted-foreground" style={{ width: iconSize, height: iconSize }} />
        )}
      </div>
    );
  }

  const Comp = IconObj as IconLike;
  const AvatarComp = Comp.Avatar || Comp;
  return <AvatarComp size={size} className={className} />;
}
