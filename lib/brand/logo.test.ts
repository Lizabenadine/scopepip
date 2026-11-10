import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { displayLogoUrl, logoFileError } from "./logo.ts"

describe("company logo", () => {
  it("keeps a blank logo off the page", () => {
    assert.equal(displayLogoUrl(undefined), null)
    assert.equal(displayLogoUrl("  "), null)
    assert.equal(displayLogoUrl("javascript:alert(1)"), null)
  })

  it("accepts a public image address and a stored image", () => {
    assert.equal(displayLogoUrl("https://cdn.example.com/company-assets/logo"), "https://cdn.example.com/company-assets/logo")
    assert.equal(displayLogoUrl("data:image/png;base64,aaaa"), "data:image/png;base64,aaaa")
    assert.equal(displayLogoUrl("data:image/jpg;base64,bbbb"), "data:image/jpg;base64,bbbb")
    assert.equal(displayLogoUrl("data:image/jpeg;base64,cccc"), "data:image/jpeg;base64,cccc")
  })

  it("traces estimateSettings.logoUrl saved in Settings into resolved proposal brand", async () => {
    const { resolveCompanyBrand } = await import("../proposals/htmlPdf.ts")
    const testLogo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    const brand = await resolveCompanyBrand({
      estimateSettings: {
        companyName: "supper",
        logoUrl: testLogo,
      } as any,
    })
    assert.equal(brand.companyName, "supper")
    assert.equal(brand.logoUrl, testLogo)
  })

  it("rejects a file that is not a small image", () => {
    assert.equal(logoFileError({ type: "application/pdf", size: 100 }), "Use a PNG, JPG, WEBP, or GIF.")
    assert.equal(logoFileError({ type: "image/png", size: 3 * 1024 * 1024 }), "Use an image under 2 MB.")
    assert.equal(logoFileError({ type: "image/png", size: 120 }), null)
  })
})
