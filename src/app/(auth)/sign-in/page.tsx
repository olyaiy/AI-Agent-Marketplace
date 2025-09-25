
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { SignInCard } from './sign-in-card';



export default async function SignInPage() {
  const headerList = await headers();
  const sessionResult = await auth.api
    .getSession({ headers: headerList })
    .catch(() => null);

  if (sessionResult?.user) {
    redirect('/');
  }

  return <SignInCard/>;
}

