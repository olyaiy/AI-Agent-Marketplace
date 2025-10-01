"use client";

import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { signOutAction } from '@/actions/auth';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

interface AccountNavActionsProps {
  userEmail?: string | null;
  callbackURL?: string;
}

export function AccountNavActions({ userEmail, callbackURL }: AccountNavActionsProps) {
  const [isPending, startTransition] = useTransition();

  if (!userEmail) {
    return (
      <GoogleSignInButton 
        callbackURL={callbackURL}
        className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-white"
      />
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

