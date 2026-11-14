interface LoadingSkeletonProps {
  count?: number;
}

export default function LoadingSkeleton({ count = 6 }: LoadingSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5" aria-busy="true" aria-label="جاري التحميل">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-neutral-200/80 p-5 space-y-4 animate-pulse"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-neutral-200 rounded-md w-2/3" />
              <div className="h-3 bg-neutral-100 rounded-md w-1/2" />
            </div>
            <div className="h-6 w-16 bg-neutral-200 rounded-full" />
          </div>
          <div className="h-14 bg-neutral-100 rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-8 bg-neutral-100 rounded-lg" />
            <div className="h-8 bg-neutral-100 rounded-lg" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
            <div className="h-8 w-20 bg-neutral-200 rounded-lg" />
            <div className="h-8 w-24 bg-neutral-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
