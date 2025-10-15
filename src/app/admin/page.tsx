import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import AdminDashboard from '@/components/AdminDashboard';

export default async function AdminPage() {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null);

  if (!session?.user) {
    redirect('/');
  }

  // Check if user is admin
  const isAdmin = session.user.role === 'admin';
  
  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, roles, and permissions
        </p>
      </div>
      <AdminDashboard />
    </div>
  );
}

