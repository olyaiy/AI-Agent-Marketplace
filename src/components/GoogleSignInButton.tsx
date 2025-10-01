"use client";

import Image from 'next/image';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

interface GoogleSignInButtonProps {
  callbackURL?: string;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  size?: 'default' | 'sm' | 'lg';
}

export function GoogleSignInButton({ 
  callbackURL, 
  variant = 'outline', 
  className,
  size = 'default' 
}: GoogleSignInButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        startTransition(async () => {
          const redirectUrl = callbackURL ?? (typeof window !== 'undefined' ? window.location.href : '/');
          await authClient.signIn.social({ provider: 'google', callbackURL: redirectUrl });
        });
      }}
      disabled={isPending}
    >
      <Image
        src="https://www.gstatic.com/images/branding/product/2x/googleg_64dp.png"
        alt="Google"
        width={18}
        height={18}
        className="mr-2"
      />
      {isPending ? 'Redirecting…' : 'Sign in with Google'}
    </Button>
  );
}

