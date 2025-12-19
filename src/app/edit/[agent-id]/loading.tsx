import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-screen-xl">
        <div className="min-h-screen p-6 lg:p-12 xl:p-16 flex flex-col">
          {/* Action bar */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          </div>

          {/* Hero section */}
          <div className="mb-12">
            <div className="flex items-start gap-6">
              <Skeleton className="h-32 w-32 rounded-md" />
              <div className="flex-1 space-y-3 pt-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-48" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-3 mb-8 overflow-x-auto">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
