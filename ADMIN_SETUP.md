# Admin Functionality Setup Guide

This guide explains how to use the admin functionality that has been added to your application using Better Auth's admin plugin.

## What Was Added

### 1. **Server-Side Configuration**
- Added `admin` plugin to Better Auth configuration in `src/lib/auth.ts`
- Configured default role as `user` and admin roles as `['admin']`

### 2. **Client-Side Configuration**
- Added `adminClient` plugin to auth client in `src/lib/auth-client.ts`
- Enables admin operations from the client

### 3. **Database Schema Updates**
- Added admin fields to the `user` table:
  - `role` (text, default: 'user')
  - `banned` (boolean, default: false)
  - `banReason` (text, nullable)
  - `banExpires` (timestamp, nullable)
- Added `impersonatedBy` field to the `session` table for session impersonation tracking

### 4. **Admin Dashboard**
- Created `/admin` page with full user management interface
- Features include:
  - List all users with search and pagination
  - Create new users
  - Change user roles
  - Ban/unban users
  - Set user passwords
  - Delete users permanently

### 5. **Navigation**
- Added admin link to sidebar (visible only to admin users)
- Shield icon indicates admin-only section

## How to Make a User an Admin

Since this is the first setup, you'll need to manually promote a user to admin. Here are three methods:

### Method 1: Direct Database Update (Recommended for First Admin)

```sql
-- Replace 'user@example.com' with your email
UPDATE "user" SET role = 'admin' WHERE email = 'user@example.com';
```

### Method 2: Using the Admin Plugin Options

You can add specific user IDs as admins in `src/lib/auth.ts`:

```typescript
admin({
  defaultRole: 'user',
  adminRoles: ['admin'],
  adminUserIds: ['user-id-here'], // Add your user ID here
})
```

### Method 3: Create a Migration Script

Create a script to promote your first admin:

```typescript
// scripts/create-first-admin.js
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function makeAdmin(email) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await pool.query(
      `UPDATE "user" SET role = $1 WHERE email = $2`,
      ['admin', email]
    );
    console.log(`✅ User ${email} is now an admin`);
  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    await pool.end();
  }
}

// Replace with your email
makeAdmin('your-email@example.com');
```

## Admin Features

### User Management

**List Users**
- Search by email or name
- Sort by creation date
- Paginate through results (10 per page)

**Create User**
- Set email, password, name, and role
- Useful for creating test accounts or adding team members

**Change Role**
- Promote users to admin
- Demote admins back to regular users

**Ban Users**
- Temporary or permanent bans
- Add ban reason for record-keeping
- Revokes all existing sessions
- Banned users cannot sign in

**Unban Users**
- Remove bans to restore access

**Set Password**
- Reset user passwords as admin
- Useful for account recovery

**Delete User**
- Permanently remove users from the database
- This action cannot be undone

### Session Management (Available via API)

While not in the UI yet, you can use these features programmatically:

```typescript
// List all sessions for a user
await authClient.admin.listUserSessions({ userId: 'user-id' });

// Revoke a specific session
await authClient.admin.revokeUserSession({ sessionToken: 'token' });

// Revoke all sessions for a user
await authClient.admin.revokeUserSessions({ userId: 'user-id' });

// Impersonate a user (creates admin session as that user)
await authClient.admin.impersonateUser({ userId: 'user-id' });

// Stop impersonating
await authClient.admin.stopImpersonating();
```

## Security Considerations

1. **Access Control**: Only users with `role = 'admin'` can access `/admin` page
2. **Session Validation**: All admin operations require valid session cookies
3. **Audit Trail**: Ban reasons are stored for accountability
4. **Banned Users**: Cannot sign in until unbanned
5. **Hard Deletes**: User deletion is permanent - use with caution

## Custom Permissions (Optional)

You can create custom permission sets if you need more granular control. See the Better Auth documentation for details on creating custom roles and permissions using `createAccessControl`.

## Troubleshooting

### "Access Denied" when visiting /admin
- Make sure your user has `role = 'admin'` in the database
- Check that you're signed in
- Verify the session is valid

### Admin operations failing
- Check browser console for detailed error messages
- Verify your database connection
- Make sure the admin plugin is properly configured in both client and server

### Database issues
- Run `pnpm drizzle-kit generate` to regenerate schema if needed
- Check that all migrations have been applied

## Next Steps

Now that admin functionality is set up, you can:

1. Make your first user an admin (see above)
2. Sign in and navigate to `/admin`
3. Create additional admin users if needed
4. Manage your user base through the dashboard

## API Reference

For programmatic access to admin functions in your code:

**Server-side:**
```typescript
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// Example: Get session and check if admin
const headerList = await headers();
const session = await auth.api.getSession({ headers: headerList });
const isAdmin = session?.user.role === 'admin';

// Example: Ban a user server-side
await auth.api.banUser({
  body: {
    userId: 'user-id',
    banReason: 'Spam',
    banExpiresIn: 7 * 24 * 60 * 60, // 7 days
  },
  headers: headerList
});
```

**Client-side:**
```typescript
import { authClient } from '@/lib/auth-client';

// Example: Check current user's admin status
const session = await authClient.getSession();
const isAdmin = session?.user.role === 'admin';

// Example: Create a user
await authClient.admin.createUser({
  email: 'newuser@example.com',
  password: 'securepassword',
  name: 'New User',
  role: 'user',
  data: {},
});
```

## Resources

- [Better Auth Admin Plugin Documentation](https://www.better-auth.com/docs/plugins/admin)
- [Better Auth Core Documentation](https://www.better-auth.com/docs)

