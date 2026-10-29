import { linePhoto } from "@/lib/estimate/line-photo"

export function ProposalLinePhoto({ src, alt }: { src: string | undefined; alt: string }) {
  const photo = linePhoto(src)
  if (!photo) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt={alt}
      data-testid="proposal-line-photo"
      className="mb-2 aspect-[4/3] w-full max-w-xs rounded-xl object-cover"
    />
  )
}
