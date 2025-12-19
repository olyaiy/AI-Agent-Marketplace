import { Skeleton } from "@/components/ui/skeleton";

const badgeItems = Array.from({ length: 5 });
const heroMobileItems = Array.from({ length: 2 });
const carouselItems = Array.from({ length: 4 });
const gridItems = Array.from({ length: 6 });
const curatedRows = Array.from({ length: 2 });

export default function Loading() {
  return (
    <main className="min-h-screen px-4 sm:px-2 md:px-4">
      <div className="mx-auto max-w-5xl py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="hidden md:block h-8 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-full md:w-80 rounded-md" />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {badgeItems.map((_, index) => (
            <Skeleton key={`badge-${index}`} className="h-6 w-20 rounded-full" />
          ))}
        </div>

        <div className="md:hidden mb-6 -mx-4 px-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {heroMobileItems.map((_, index) => (
              <Skeleton key={`hero-mobile-${index}`} className="w-36 h-36 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8">
          <Skeleton className="md:col-span-2 h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-4 pb-2" style={{ minWidth: "min-content" }}>
              {carouselItems.map((_, index) => (
                <Skeleton key={`carousel-${index}`} className="h-36 w-[220px] rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {curatedRows.map((_, rowIndex) => (
            <section key={`curated-${rowIndex}`} className="space-y-3">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {gridItems.map((_, index) => (
                  <Skeleton key={`curated-card-${rowIndex}-${index}`} className="h-36 md:h-44 rounded-xl" />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="space-y-4 mt-10">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {gridItems.map((_, index) => (
              <Skeleton key={`more-card-${index}`} className="h-36 md:h-44 rounded-xl" />
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
        </section>
      </div>
    </main>
  );
}
