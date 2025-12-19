import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import BillingSettings from '@/components/BillingSettings';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | AI Agent Marketplace',
  description: 'Manage your credits, billing, and account preferences',
};

export default async function SettingsPage() {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);

  if (!session?.user) {
    redirect('/');
  }

  return (
    <main className="min-h-screen px-4 sm:px-2 md:px-4">
      <div className="mx-auto max-w-5xl py-8 md:py-12 space-y-8">
        {/* Header Section */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-lg text-muted-foreground">
            Manage your credits, billing, and account preferences
          </p>
        </div>

        {/* Main Content */}
        <BillingSettings />
      </div>
    </main>
  );
}
