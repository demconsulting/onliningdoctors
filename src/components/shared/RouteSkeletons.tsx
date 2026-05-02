import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout-matching skeletons for in-route data loads. These are intentionally
 * lightweight (no external deps) and shaped to match real content so that
 * navigating between landing → search → dashboard never shows a blank or
 * spinner-only view, even on slow networks.
 */

export const SectionSkeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`container mx-auto px-4 py-12 ${className}`}
    role="status"
    aria-label="Loading section"
  >
    <Skeleton className="mx-auto mb-3 h-8 w-64 max-w-full" />
    <Skeleton className="mx-auto mb-10 h-4 w-96 max-w-full" />
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
    <span className="sr-only">Loading…</span>
  </div>
);

export const DoctorCardSkeleton = () => (
  <div className="rounded-xl border bg-card p-5">
    <div className="flex items-center gap-3">
      <Skeleton className="h-14 w-14 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
    <div className="mt-4 flex gap-2">
      <Skeleton className="h-9 flex-1" />
      <Skeleton className="h-9 w-20" />
    </div>
  </div>
);

export const DoctorsGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div
    className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
    role="status"
    aria-label="Loading doctors"
  >
    {Array.from({ length: count }).map((_, i) => (
      <DoctorCardSkeleton key={i} />
    ))}
    <span className="sr-only">Loading doctors…</span>
  </div>
);

export const AppointmentCardSkeleton = () => (
  <div className="rounded-lg border bg-card p-4">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
    </div>
    <div className="mt-4 flex gap-2">
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-9 w-24" />
    </div>
  </div>
);

export const AppointmentListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4" role="status" aria-label="Loading appointments">
    {Array.from({ length: count }).map((_, i) => (
      <AppointmentCardSkeleton key={i} />
    ))}
    <span className="sr-only">Loading appointments…</span>
  </div>
);

/**
 * Dashboard shell skeleton — used while auth check + initial role lookup
 * are in flight. Matches Navbar + page header + tabs + content layout so
 * there's no jarring jump when the real dashboard mounts.
 */
export const DashboardShellSkeleton = () => (
  <div
    className="flex min-h-screen flex-col bg-background"
    role="status"
    aria-label="Loading dashboard"
  >
    <div className="h-16 border-b flex items-center px-4 gap-4">
      <Skeleton className="h-8 w-32" />
      <div className="ml-auto flex gap-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
    <main className="container mx-auto flex-1 px-3 py-4 sm:px-4 sm:py-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-48 max-w-full" />
      </div>
      <Skeleton className="mb-6 h-10 w-full" />
      <AppointmentListSkeleton />
    </main>
    <span className="sr-only">Loading dashboard…</span>
  </div>
);
