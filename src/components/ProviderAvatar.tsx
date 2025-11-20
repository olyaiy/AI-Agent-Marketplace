import React from 'react';
import { PROVIDER_ICON_MAP } from '@/lib/model-display';

type IconLike = React.ComponentType<{ size?: number; className?: string }> & { Avatar?: React.ComponentType<{ size?: number; className?: string }> };

export function ProviderAvatar({ providerSlug, size = 18, className }: { providerSlug: string | null; size?: number; className?: string }) {
  const slug = providerSlug || '';
  const IconObj = PROVIDER_ICON_MAP[slug];
  if (!IconObj) {
    return null;
  }
  const Comp = IconObj as IconLike;
  const AvatarComp = Comp.Avatar || Comp;
  return <AvatarComp size={size} className={className} />;
}
