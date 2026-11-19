export default function LoadingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="جارٍ تحميل بيانات المشتريات"
      className="space-y-5"
    >
      {/* Toolbar Skeleton */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-2xs animate-pulse space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 h-10 bg-neutral-100 rounded-xl" />
          <div className="lg:col-span-2 h-10 bg-neutral-100 rounded-xl" />
          <div className="lg:col-span-2 h-10 bg-neutral-100 rounded-xl" />
          <div className="lg:col-span-2 h-10 bg-neutral-100 rounded-xl" />
          <div className="lg:col-span-2 h-10 bg-neutral-100 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="h-12 bg-[#101B30]/95" />
        <div className="divide-y divide-neutral-100">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="p-4 grid grid-cols-2 md:grid-cols-8 gap-3 items-center animate-pulse"
            >
              <div className="h-4 w-20 bg-neutral-200 rounded-md" />
              <div className="h-4 w-24 bg-neutral-200 rounded-md" />
              <div className="h-4 w-28 bg-neutral-100 rounded-md hidden md:block" />
              <div className="h-4 w-20 bg-neutral-100 rounded-md hidden md:block" />
              <div className="h-4 w-16 bg-neutral-100 rounded-md hidden md:block" />
              <div className="h-4 w-16 bg-neutral-100 rounded-md hidden md:block" />
              <div className="h-6 w-20 bg-neutral-100 rounded-full hidden md:block" />
              <div className="h-8 w-24 bg-neutral-200 rounded-lg justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
