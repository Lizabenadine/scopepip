"use client"

import Link from "next/link"
import type { EstimateQuote, PricedSurface } from "@/lib/estimate/calculate"
import { gallonsLabel, money } from "@/lib/format"

interface MaterialGroup {
  key: string
  productName: string
  paintBrand?: string
  colorName?: string
  colorCode?: string
  sheen?: string
  productCostPerGallon?: number
  paintGallons: number
  materialCost: number
  surfaces: Array<{
    id: string
    areaName: string
    surfaceLabel: string
    paintGallons: number
    materialCost: number
    productCostPerGallon?: number
  }>
}

export function MaterialsBuyList({
  quote,
  estimateId,
}: {
  quote: EstimateQuote
  estimateId?: string | null
}) {
  const groups: MaterialGroup[] = []
  const groupMap = new Map<string, MaterialGroup>()

  for (const area of quote.areas) {
    for (const surface of area.surfaces) {
      if (surface.paintGallons <= 0) continue
      const productName = surface.productName || "Paint"
      const specKey = [
        productName,
        surface.paintBrand ?? "",
        surface.colorCode ?? "",
        surface.colorName ?? "",
        surface.sheen ?? "",
      ].join("::")

      let group = groupMap.get(specKey)
      if (!group) {
        group = {
          key: specKey,
          productName,
          paintBrand: surface.paintBrand,
          colorName: surface.colorName,
          colorCode: surface.colorCode,
          sheen: surface.sheen,
          productCostPerGallon: surface.productCostPerGallon,
          paintGallons: 0,
          materialCost: 0,
          surfaces: [],
        }
        groupMap.set(specKey, group)
        groups.push(group)
      }

      group.paintGallons += surface.paintGallons
      group.materialCost += surface.materialCost
      group.surfaces.push({
        id: surface.id,
        areaName: area.name,
        surfaceLabel: surface.internalLabel,
        paintGallons: surface.paintGallons,
        materialCost: surface.materialCost,
        productCostPerGallon: surface.productCostPerGallon,
      })
    }
  }

  const customMaterials = quote.lineItems.flatMap((item) =>
    (item.materials ?? []).map((m) => ({
      ...m,
      lineLabel: item.label,
    })),
  )

  const totalBuyGallons = groups.reduce(
    (sum, g) => sum + Math.ceil(g.paintGallons - 1e-9),
    0,
  )

  const hasMissingPrice = groups.some(
    (g) => !g.productCostPerGallon || g.productCostPerGallon === 0,
  )

  return (
    <section className="flex min-w-0 flex-col gap-2" data-testid="materials-buy-list-section">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Materials & Buy List
        </h2>
        {estimateId ? (
          <Link
            href={`/estimates/${estimateId}/store-list`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Print store list →
          </Link>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
          <div>
            <span className="font-semibold text-foreground">
              {gallonsLabel(quote.paintGallons)} total
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              ({totalBuyGallons} gal buy list)
            </span>
          </div>
          <div className="text-xs">
            {quote.materialCost > 0 ? (
              <span className="font-semibold text-foreground">
                Total Materials: {money(quote.materialCost)}
              </span>
            ) : hasMissingPrice && quote.paintGallons > 0 ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Paint prices not configured ($0.00 rate)
              </span>
            ) : (
              <span className="text-muted-foreground">{money(0)}</span>
            )}
          </div>
        </div>

        {groups.length === 0 && customMaterials.length === 0 ? (
          <p className="pt-3 text-sm text-muted-foreground">
            No paint or materials calculated yet. Add room dimensions and select surfaces above.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {groups.map((group) => {
              const specDisplay = [
                group.paintBrand,
                group.colorCode,
                group.colorName,
                group.sheen,
              ]
                .filter(Boolean)
                .join(" · ")

              const buyCans = Math.ceil(group.paintGallons - 1e-9)
              const hasPrice =
                group.productCostPerGallon && group.productCostPerGallon > 0

              return (
                <div
                  key={group.key}
                  className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="font-semibold">{group.productName}</span>
                      {specDisplay ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({specDisplay})
                        </span>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold tabular-nums">
                        {gallonsLabel(group.paintGallons)}
                      </span>
                      <span className="ml-2 text-xs font-medium text-muted-foreground">
                        Buy {buyCans} gal
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Pricing:{" "}
                    {hasPrice ? (
                      <span className="font-medium text-foreground">
                        ${group.productCostPerGallon}/gal · Cost: {money(group.materialCost)}
                      </span>
                    ) : (
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        Price not configured
                      </span>
                    )}
                  </div>

                  <ul className="mt-2 divide-y divide-border/40 border-t border-border/40 pt-1 text-xs">
                    {group.surfaces.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between py-1 text-muted-foreground"
                      >
                        <span>
                          <span className="font-medium text-foreground">{s.areaName}</span>
                          {" · "}
                          {s.surfaceLabel}
                        </span>
                        <span className="tabular-nums">{gallonsLabel(s.paintGallons)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}

            {customMaterials.length > 0 ? (
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Additional Materials
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-xs">
                  {customMaterials.map((mat) => (
                    <li
                      key={mat.id}
                      className="flex items-center justify-between text-muted-foreground"
                    >
                      <span>
                        <span className="font-medium text-foreground">{mat.name || "Material"}</span>
                        {" · "}
                        Qty: {mat.quantity} @ ${mat.unitPrice}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {money(mat.cost)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
