import { redirect } from "next/navigation"

export default function SignedProposalsRedirectPage() {
  redirect("/proposal?tab=signed")
}
