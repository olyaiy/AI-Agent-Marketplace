"use client";

import { Suspense } from 'react';

import { authClient } from '@/lib/auth-client';

import { AuthSignInActions } from './sign-in-actions';

export function SignInCard() {
  const sessionStore = authClient.useSession();
  const session = sessionStore.data;

  return (
    <section className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border bg-background shadow-xl">
          <div className="border-b px-6 py-4">
            <h1 className="text-lg font-semibold">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use your Google account to access the dashboard.
            </p>
          </div>

          <div className="px-6 py-8">
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading session…</p>}>
              <SessionPreview sessionEmail={session?.user?.email} />
            </Suspense>

            <AuthSignInActions />
          </div>
        </div>
      </div>
    </section>
  );
}

function SessionPreview({ sessionEmail }: { sessionEmail?: string }) {
  if (!sessionEmail) {
    return null;
  }

  return (
    <p className="mb-4 text-sm text-muted-foreground">Currently signed in as {sessionEmail}</p>
  );
}

