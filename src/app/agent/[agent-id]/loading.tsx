import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <main className="h-full">
            {/* Mobile Layout */}
            <div className="md:hidden fixed inset-0 flex flex-col bg-background">
                {/* Mobile Header skeleton - matches AgentInfoSheet */}
                <div className="flex-shrink-0 bg-background border-b px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                </div>

                {/* Hero + Chat area - new chat shows hero, no messages */}
                <div className="flex-1 overflow-hidden flex flex-col items-center justify-center px-6 pb-24">
                    {/* Hero skeleton */}
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <Skeleton className="h-20 w-20 rounded-2xl" />
                        <Skeleton className="h-7 w-40" />
                        <Skeleton className="h-4 w-56" />
                        <div className="flex gap-2 pt-2">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Input skeleton - fixed at bottom */}
                <div className="flex-shrink-0 p-4 bg-background border-t">
                    <Skeleton className="h-12 w-full rounded-full" />
                </div>
            </div>

            {/* Desktop Layout - matches AgentChatLayout with no header (new chat) */}
            <div className="hidden md:block">
                {/* No header for new chat - starts with hero */}

                {/* Chat area with hero */}
                <div className="h-[calc(100vh-60px)]">
                    <div className="mx-auto h-full max-w-3xl flex flex-col px-4">
                        {/* Hero area - centered */}
                        <div className="flex-1 flex flex-col items-center justify-center pb-20">
                            <div className="flex flex-col items-center space-y-5 text-center">
                                {/* Avatar */}
                                <Skeleton className="h-24 w-24 rounded-2xl" />

                                {/* Name */}
                                <Skeleton className="h-8 w-48" />

                                {/* Tagline */}
                                <Skeleton className="h-5 w-72" />

                                {/* Description lines */}
                                <div className="space-y-2 pt-2 max-w-md">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-[90%] mx-auto" />
                                    <Skeleton className="h-4 w-[75%] mx-auto" />
                                </div>

                                {/* Badges */}
                                <div className="flex gap-2 pt-3">
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                </div>
                            </div>
                        </div>

                        {/* Input skeleton */}
                        <div className="flex-shrink-0 py-4">
                            <Skeleton className="h-14 w-full rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
