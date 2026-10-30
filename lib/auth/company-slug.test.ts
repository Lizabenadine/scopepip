import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { matchCompanySlug, publicCompanySlug } from "./company-slug.ts"

const companies = [
  { slug: "office-book", name: "ScopePipe" },
  { slug: "hale-painting", name: "Hale Painting" },
]

describe("company form address", () => {
  it("accepts the stored address, any capitalization, and the current company name", () => {
    assert.equal(matchCompanySlug(companies, "office-book")?.slug, "office-book")
    assert.equal(matchCompanySlug(companies, "Office-Book")?.slug, "office-book")
    assert.equal(matchCompanySlug(companies, "scopepipe")?.slug, "office-book")
    assert.equal(matchCompanySlug(companies, "hale-painting")?.name, "Hale Painting")
  })

  it("rejects an unknown address", () => {
    assert.equal(matchCompanySlug(companies, "not-a-company"), null)
    assert.equal(matchCompanySlug(companies, "Scope Pipe"), null)
  })

  it("publishes the company name when that address still reaches the same company", () => {
    assert.equal(publicCompanySlug(companies[0], companies), "scopepipe")
    assert.equal(publicCompanySlug(companies[1], companies), "hale-painting")
  })

  it("keeps the stored address when the name address belongs to another company", () => {
    const taken = [
      { slug: "scopepipe", name: "Other" },
      { slug: "office-book", name: "ScopePipe" },
    ]
    assert.equal(publicCompanySlug(taken[1], taken), "office-book")
    assert.equal(matchCompanySlug(taken, "office-book")?.slug, "office-book")
  })
})
