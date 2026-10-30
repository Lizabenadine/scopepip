"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { storeList } from "@/lib/estimate/store-list"
import { translatePainting } from "@/lib/field/terms"
import { gallonsLabel } from "@/lib/format"
import { officeLabel } from "@/lib/office/dashboard-copy"

export function StoreListView({ id }: { id: string }) {
  const scope = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => translatePainting(text, language)
  const label = (text: string) => officeLabel(text, language)
  const estimate = scope.estimates.find((item) => item.id === id)
  const client = scope.clients.find((item) => item.id === estimate?.clientId)

  if (!scope.ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  if (!estimate) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">{label("Store list")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {language === "es" ? "Ese estimado no está en este libro." : "That estimate is not in this book."}
        </p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary">
          {label("Jobs")}
        </Link>
      </div>
    )
  }

  const list = storeList(estimate, client?.name ?? "")

  return (
    <article data-testid="store-list" className="mx-auto flex max-w-3xl flex-col gap-6 pb-8">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/estimates/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {label("Estimate")}
        </Link>
        <button type="button" className="text-sm font-medium text-primary" onClick={() => window.print()}>
          {language === "es" ? "Imprimir" : "Print"}
        </button>
      </div>
      <header>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {label("Store list")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{list.title || label("Estimate")}</h1>
        <p className="mt-1 text-sm">{list.clientName}</p>
        {list.address ? <p className="text-sm text-muted-foreground">{list.address}</p> : null}
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          {language === "es"
            ? "Llévela a la tienda de pintura o a la cuadrilla. Los galones son los que contó el estimado. Comprar es el siguiente galón entero de cada producto."
            : "Hand this to the paint store or the crew. The gallons are what the estimate counted. Buy is the next whole gallon of each product."}
        </p>
      </header>
      {list.products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          {language === "es" ? "Este estimado todavía no tiene pintura para comprar." : "This estimate has no paint to buy yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {list.products.map((product) => (
            <section key={product.productName} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">{say(product.productName)}</h2>
                <p className="text-sm font-semibold tabular-nums">
                  {gallonsLabel(product.paintGallons)}
                  <span className="ml-2 font-medium text-muted-foreground">
                    {language === "es" ? "Comprar" : "Buy"} {product.buyGallons}
                  </span>
                </p>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {product.rooms.map((room) => (
                  <li key={room.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium">{say(room.areaName)}</span>
                      <span className="text-muted-foreground"> · {say(room.surfaceLabel)}</span>
                      {room.includesPrimer ? (
                        <span className="text-muted-foreground">
                          {language === "es" ? " · incluye primario" : " · includes primer"}
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums">{gallonsLabel(room.paintGallons)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="text-sm font-medium" data-testid="store-list-total">
            {gallonsLabel(list.paintGallons)}
            <span className="ml-2 text-muted-foreground">
              {language === "es" ? "Comprar" : "Buy"} {list.buyGallons} gal
            </span>
          </p>
        </div>
      )}
    </article>
  )
}
