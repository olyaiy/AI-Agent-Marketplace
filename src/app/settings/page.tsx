import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import BillingSettings from '@/components/BillingSettings';

export default async function SettingsPage() {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);

  if (!session?.user) {
    redirect('/');
  }

  return (
    <main className="min-h-screen px-4 sm:px-2 md:px-4">
      <div className="mx-auto max-w-5xl py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your credits, auto-reload, and billing activity.</p>
        </div>
        <BillingSettings />
      </div>
    </main>
  );
}
