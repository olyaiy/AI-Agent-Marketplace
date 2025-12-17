import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="relative h-full">
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

                {/* Chat area skeletons */}
                <div className="flex-1 overflow-hidden px-4 pt-6 space-y-5">
                    <div className="flex justify-start">
                        <Skeleton className="h-14 w-[75%] rounded-2xl rounded-tl-none" />
                    </div>
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-[55%] rounded-2xl rounded-tr-none" />
                    </div>
                    <div className="flex justify-start">
                        <Skeleton className="h-20 w-[80%] rounded-2xl rounded-tl-none" />
                    </div>
                    <div className="flex justify-end">
                        <Skeleton className="h-12 w-[50%] rounded-2xl rounded-tr-none" />
                    </div>
                </div>

                {/* Input skeleton */}
                <div className="flex-shrink-0 p-4">
                    <Skeleton className="h-12 w-full rounded-full" />
                </div>
            </div>

            {/* Desktop Layout - matches AgentChatLayout structure */}
            <div className="hidden md:block">
                {/* Header Bar skeleton - matches AgentHeaderBar */}
                <div className="-mt-4 -mx-6 rounded-t-xl overflow-hidden">
                    <div className="sticky top-0 z-40 w-full h-12 flex items-center bg-background/80 backdrop-blur-sm border-b border-border/50 pl-12 pr-4">
                        {/* Agent info skeleton */}
                        <div className="flex items-center gap-2.5 px-2 py-1.5">
                            <Skeleton className="h-[30px] w-[30px] rounded-md" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3.5 w-3.5 rounded" />
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* New Chat button skeleton */}
                        <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                </div>

                {/* Chat area - centered, matches Chat component layout */}
                <div className="h-[calc(100vh-100px)]">
                    <div className="mx-auto h-full max-w-3xl flex flex-col px-4">
                        {/* Messages area */}
                        <div className="flex-1 space-y-6 py-6">
                            {/* Assistant message */}
                            <div className="flex justify-start">
                                <div className="flex gap-3 max-w-[85%]">
                                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                                    <Skeleton className="h-20 flex-1 min-w-[280px] rounded-2xl rounded-tl-none" />
                                </div>
                            </div>

                            {/* User message */}
                            <div className="flex justify-end">
                                <Skeleton className="h-12 w-[45%] rounded-2xl rounded-tr-none" />
                            </div>

                            {/* Assistant message */}
                            <div className="flex justify-start">
                                <div className="flex gap-3 max-w-[85%]">
                                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                                    <Skeleton className="h-28 flex-1 min-w-[350px] rounded-2xl rounded-tl-none" />
                                </div>
                            </div>

                            {/* User message */}
                            <div className="flex justify-end">
                                <Skeleton className="h-10 w-[35%] rounded-2xl rounded-tr-none" />
                            </div>
                        </div>

                        {/* Input skeleton */}
                        <div className="flex-shrink-0 py-4">
                            <Skeleton className="h-14 w-full rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
