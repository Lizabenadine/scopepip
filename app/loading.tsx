export default function Loading() {
  return (
    <div className="grid gap-3" aria-hidden>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-11 animate-pulse rounded-lg bg-muted" />
      <div className="h-36 animate-pulse rounded-2xl bg-muted" />
      <div className="h-36 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}
