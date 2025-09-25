"use client";

import Image from 'next/image';
import { Suspense } from 'react';

import { Badge } from '@/components/ui/badge';
import { authClient } from '@/lib/auth-client';

import { AuthSignInActions } from './sign-in-actions';

export function SignInCard() {
  const sessionStore = authClient.useSession();
  const session = sessionStore.data;

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25)_0,_transparent_60%)]" />
      <div className="relative mx-auto w-full max-w-lg">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-6 px-8 py-10 sm:px-10">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="secondary" className="mb-3">Welcome back</Badge>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Access your workspace</h1>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Sign in with Google to manage agents, collaborate with teammates, and keep your session synced across devices.
                </p>
              </div>
              <div className="hidden sm:block">
                <Image
                  src="https://www.gstatic.com/images/branding/product/2x/googleg_64dp.png"
                  alt="Google"
                  priority
                  width={64}
                  height={64}
                  className="rounded-full border border-white/20 bg-white p-2 shadow-lg"
                />
              </div>
            </div>

            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading session…</p>}>
              <SessionPreview sessionEmail={session?.user?.email} />
            </Suspense>

            <AuthSignInActions />

            <p className="text-center text-xs text-muted-foreground">
              We only request the minimal permissions needed to authenticate your account. Learn more in our privacy policy.
            </p>
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
    <div className="rounded-md border border-emerald-200/70 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      Signed in as <span className="font-medium">{sessionEmail}</span>
    </div>
  );
}

