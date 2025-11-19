import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="relative h-full md:max-h-[calc(100vh-200px)]">
            {/* Mobile Layout */}
            <div className="md:hidden flex flex-col h-full px-4 pb-4">
                {/* Sticky header skeleton */}
                <div className="flex-shrink-0 sticky top-0 z-10 px-6 bg-background border-b py-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                </div>
                {/* Chat area skeletons */}
                <div className="flex-1 overflow-hidden pt-8 space-y-6">
                    <div className="flex justify-start">
                        <Skeleton className="h-16 w-[70%] rounded-2xl rounded-tl-none" />
                    </div>
                    <div className="flex justify-end">
                        <Skeleton className="h-12 w-[50%] rounded-2xl rounded-tr-none" />
                    </div>
                    <div className="flex justify-start">
                        <Skeleton className="h-24 w-[80%] rounded-2xl rounded-tl-none" />
                    </div>
                    <div className="flex justify-end">
                        <Skeleton className="h-16 w-[60%] rounded-2xl rounded-tr-none" />
                    </div>
                </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex h-full gap-4 max-h-[calc(100vh-100px)]">
                <div className="flex-1 max-w-[75%] flex flex-col pt-4">
                    <div className="flex-1 space-y-8 px-4">
                        <div className="flex justify-start">
                            <div className="flex gap-3 max-w-[80%]">
                                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                                <Skeleton className="h-20 w-full min-w-[300px] rounded-2xl rounded-tl-none" />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Skeleton className="h-12 w-[40%] rounded-2xl rounded-tr-none" />
                        </div>
                        <div className="flex justify-start">
                            <div className="flex gap-3 max-w-[80%]">
                                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                                <Skeleton className="h-32 w-full min-w-[400px] rounded-2xl rounded-tl-none" />
                            </div>
                        </div>
                    </div>
                    {/* Input area skeleton */}
                    <div className="h-20 mt-4">
                        <Skeleton className="h-12 w-full rounded-full" />
                    </div>
                </div>

                <div className="w-[25%] min-w-[280px] flex-shrink-0">
                    {/* Sidebar skeleton */}
                    <div className="h-full border rounded-xl p-6 space-y-6 bg-card/50">
                        <div className="flex flex-col items-center space-y-4">
                            <Skeleton className="h-24 w-24 rounded-full" />
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <div className="space-y-3 pt-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[80%]" />
                        </div>
                        <div className="pt-8 space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
