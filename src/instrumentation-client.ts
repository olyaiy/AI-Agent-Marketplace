/**
 * PostHog initialization for Next.js 15.3+ instrumentation-client.
 * This runs on the client side early in the lifecycle.
 */
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only',
    defaults: '2025-11-30'
});
