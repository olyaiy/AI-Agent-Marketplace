'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

export async function signOutAction(): Promise<void> {
  const headerList = await headers();
  await auth.api.signOut({ headers: headerList }).catch(() => null);
  redirect('/sign-in');
}

