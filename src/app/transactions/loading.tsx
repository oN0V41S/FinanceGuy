export default function TransactionsLoading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="animate-pulse p-4 space-y-4">
        {/* Header skeleton */}
        <div className="h-12 bg-muted rounded-lg" />
        {/* Title skeleton */}
        <div className="h-8 w-48 bg-muted rounded" />
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-muted rounded-lg" />
          <div className="h-24 bg-muted rounded-lg" />
          <div className="h-24 bg-muted rounded-lg" />
        </div>
        {/* Table skeleton */}
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
