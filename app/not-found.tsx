import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border px-4 py-10 text-center">
      <h1 className="text-xl font-semibold">That page isn&apos;t in ScopePipe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The job board is the place to start.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary">
        Back to jobs
      </Link>
    </div>
  )
}
