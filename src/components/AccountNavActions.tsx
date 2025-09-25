"use client";

import Image from 'next/image';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { signOutAction } from '@/actions/auth';
import { authClient } from '@/lib/auth-client';

interface AccountNavActionsProps {
  userEmail?: string | null;
  callbackURL?: string;
}

export function AccountNavActions({ userEmail, callbackURL }: AccountNavActionsProps) {
  const [isPending, startTransition] = useTransition();

  if (!userEmail) {
    return (
      <Button
        variant="outline"
        className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-white"
        onClick={() => {
          startTransition(async () => {
            await authClient.signIn.social({ provider: 'google', callbackURL: callbackURL ?? '/' });
          });
        }}
      >
        <Image
          src="https://www.gstatic.com/images/branding/product/2x/googleg_64dp.png"
          alt="Google"
          width={18}
          height={18}
        />
        {isPending ? 'Redirecting…' : 'Sign in with Google'}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
      <form
        action={() => {
          startTransition(async () => {
            await signOutAction();
          });
        }}
      >
        <Button type="submit" variant="ghost" disabled={isPending}>
          {isPending ? 'Signing out…' : 'Logout'}
        </Button>
      </form>
    </div>
  );
}

