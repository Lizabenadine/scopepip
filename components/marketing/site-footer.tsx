import { BrandLogo } from "@/components/brand/brand-logo"

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#02182F] py-12 text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
        <div className="text-sm">
          <div className="mb-3">
            <BrandLogo href="/" compact />
          </div>
          <p>© {new Date().getFullYear()} Scopepipe. All rights reserved.</p>
          <p className="mt-1 text-slate-500">
            Support:{" "}
            <a href="mailto:support@scopepipe.com" className="text-slate-300 hover:underline">
              support@scopepipe.com
            </a>{" "}
            | Sales:{" "}
            <a href="mailto:sales@scopepipe.com" className="text-slate-300 hover:underline">
              sales@scopepipe.com
            </a>
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <a href="/terms" className="transition-colors hover:text-white">
            Terms of Service
          </a>
          <a href="/privacy" className="transition-colors hover:text-white">
            Privacy Policy
          </a>
          <a href="/refunds" className="transition-colors hover:text-white">
            Refund Policy
          </a>
          <a href="mailto:support@scopepipe.com" className="transition-colors hover:text-white">
            Contact Support
          </a>
        </div>
      </div>
    </footer>
  )
}
