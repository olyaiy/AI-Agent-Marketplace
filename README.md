This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

## Better Auth Setup

### Dependencies

```bash
pnpm add better-auth pg
```

### Environment variables

Add the following keys to `.env.local` (defaults shown for local development):

```
DATABASE_URL=postgres://user:password@localhost:5432/database
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### Google OAuth

Create OAuth credentials in the Google Cloud Console and configure the redirect URI `<YOUR_DOMAIN>/api/auth/callback/google` (e.g., `http://localhost:3000/api/auth/callback/google` for local development).

### Server configuration

- `src/lib/auth.ts`: Better Auth instance using the PostgreSQL `pg` pool and Google provider.
- `src/app/api/auth/[...betterAuth]/route.ts`: Next.js route handler for Better Auth API.
- `src/app/api/auth/session/route.ts`: `/api/auth/session` endpoint for session lookups.

### Client utilities

- `src/lib/auth-client.ts`: shared Better Auth client for browser usage.
- `src/app/(auth)/sign-in`: minimal Google sign-in UI powered by Better Auth.

### Database schema
  
Use the Better Auth CLI to generate and apply migrations:

```bash
pnpm dlx @better-auth/cli@latest generate
pnpm dlx @better-auth/cli@latest migrate
```

### Usage notes

- Session cookies are managed through the `nextCookies` plugin.
- Google sign-in requests offline access and always prompts the account selector for reliable refresh tokens.
