import { BrandLogo } from "@/components/brand/brand-logo"

export function SiteFooter({ lang = "en" }: { lang?: "en" | "es" }) {
  const isEs = lang === "es"

  return (
    <footer className="border-t border-white/10 bg-[#02182F] py-12 text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
        <div className="text-sm text-center md:text-left">
          <div className="mb-3 flex justify-center md:justify-start">
            <BrandLogo href="/" compact />
          </div>
          <p className="text-xs text-slate-300 font-medium">
            {isEs
              ? "Software de estimados y órdenes de trabajo para contratistas de pintura, paneles de yeso y pisos."
              : "Estimating & work orders for painting, drywall, and flooring contractors."}
          </p>
          <p className="mt-1 text-xs text-slate-500">© {new Date().getFullYear()} Scopepipe. {isEs ? "Todos los derechos reservados." : "All rights reserved."}</p>
          <p className="mt-1.5 text-xs text-slate-400">
            {isEs ? "Soporte" : "Support"}:{" "}
            <a href="mailto:support@scopepipe.com" className="text-cyan-300 hover:underline">
              support@scopepipe.com
            </a>{" "}
            | {isEs ? "Ventas" : "Sales"}:{" "}
            <a href="mailto:sales@scopepipe.com" className="text-cyan-300 hover:underline">
              sales@scopepipe.com
            </a>
          </p>
        </div>
        <div className="flex max-w-xl flex-wrap justify-center gap-x-6 gap-y-2 text-xs md:justify-end">
          <a href="/estimating" className="transition-colors hover:text-white">
            {isEs ? "Estimados" : "Estimating"}
          </a>
          <a href="/proposals" className="transition-colors hover:text-white">
            {isEs ? "Propuestas" : "Proposals"}
          </a>
          <a href="/crew-sheets" className="transition-colors hover:text-white">
            {isEs ? "Órdenes de equipo" : "Crew sheets"}
          </a>
          <a href="/pricing" className="transition-colors hover:text-white">
            {isEs ? "Precios" : "Pricing"}
          </a>
          <a href="/help" className="transition-colors hover:text-white">
            {isEs ? "Ayuda" : "Help Guides"}
          </a>
          <a href="/affiliates" className="transition-colors hover:text-white">
            {isEs ? "Afiliados" : "Affiliates"}
          </a>
          <a href="/sample-proposal" className="transition-colors hover:text-white">
            {isEs ? "Propuesta de muestra" : "Sample proposal"}
          </a>
          <a href="/terms" className="transition-colors hover:text-white">
            {isEs ? "Términos" : "Terms of Service"}
          </a>
          <a href="/privacy" className="transition-colors hover:text-white">
            {isEs ? "Privacidad" : "Privacy Policy"}
          </a>
          <a href="/refunds" className="transition-colors hover:text-white">
            {isEs ? "Reembolsos" : "Refund Policy"}
          </a>
          <a href="mailto:support@scopepipe.com" className="transition-colors hover:text-white">
            {isEs ? "Contacto" : "Contact Support"}
          </a>
        </div>
      </div>
    </footer>
  )
}
