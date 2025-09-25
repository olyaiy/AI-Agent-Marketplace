"use client";

import { useCallback, useState, useTransition } from 'react';
import { Loader2, LogIn, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';

interface AuthActionButtonBaseProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => Promise<void> | void;
  disabled?: boolean;
}

function AuthActionButton({ label, icon: Icon, onClick, disabled }: AuthActionButtonBaseProps) {
  return (
    <Button className="w-full" onClick={onClick} disabled={disabled}>
      {Icon ? <Icon className="size-4" /> : null}
      {label}
    </Button>
  );
}

export function AuthSignInActions() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const sessionStore = authClient.useSession();
  const hasSession = Boolean(sessionStore.data?.user);

  const handleSignIn = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        await authClient.signIn.social({
          provider: 'google',
          callbackURL: '/'
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sign in.';
        setError(message);
      }
    });
  }, []);

  const handleSignOut = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        await authClient.signOut();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sign out.';
        setError(message);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-3">
        <AuthActionButton
          label={hasSession ? 'Continue with Google' : 'Sign in with Google'}
          icon={hasSession ? undefined : LogIn}
          onClick={handleSignIn}
          disabled={isPending}
        />

        {hasSession ? (
          <AuthActionButton label="Sign out" icon={LogOut} onClick={handleSignOut} disabled={isPending} />
        ) : null}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        By signing in you agree to our terms and acknowledge our privacy policy.
      </p>

      {isPending ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className={cn('size-4 animate-spin')} />
          <span>Waiting for Google…</span>
        </div>
      ) : null}
    </div>
  );
}

