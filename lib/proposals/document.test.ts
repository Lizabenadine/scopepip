import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { DEFAULT_ESTIMATE_SETTINGS, PAYMENT_METHODS } from "../defaults.ts"
import { applyAcceptance } from "./accept.ts"
import {
  DEFAULT_ACCEPT_WORDING,
  DEFAULT_CONTRACT_TERMS,
  DEFAULT_DECLINE_WORDING,
  DEFAULT_PROPOSAL_TEMPLATES,
  proposalDocument,
  proposalPageList,
  scheduledProductsFromAreas,
} from "./document.ts"
import { resolveCompanyLogoDataUrl } from "./htmlPdf.ts"
import { renderProposalHtml } from "./renderHtml.ts"

describe("proposalDocument", () => {
  it("uses the built-in cover, contract, and signature wording when nothing is saved", () => {
    const document = proposalDocument(DEFAULT_ESTIMATE_SETTINGS)
    assert.equal(document.coverLine, "")
    assert.deepEqual(document.photos, [])
    assert.deepEqual(document.testimonials, [])
    assert.deepEqual(document.contractTerms, DEFAULT_CONTRACT_TERMS)
    assert.equal(document.acceptWording, DEFAULT_ACCEPT_WORDING)
    assert.equal(document.declineWording, DEFAULT_DECLINE_WORDING)
    assert.deepEqual(
      proposalPageList(document).map((page) => page.label),
      ["Cover", "Scope", "Terms", "Signature"],
    )
  })

  it("keeps a saved cover, photo page, testimonial, contract, and signature wording", () => {
    const document = proposalDocument({
      ...DEFAULT_ESTIMATE_SETTINGS,
      proposalPages: {
        coverLine: " Interior painting, scheduled around your week. ",
        photos: [
          { id: "front", caption: " Front porch ", src: "https://example.com/front.jpg" },
          { id: "bad", caption: "Skip", src: "javascript:alert(1)" },
        ],
        testimonials: [
          { id: "lena", quote: " They left the house clean. ", name: " Lena Ortiz ", detail: " Portland " },
          { id: "blank", quote: " ", name: " ", detail: "" },
        ],
        contractTerms: "Work starts after the deposit.\n\nColor changes after the start are a change order.",
        acceptWording: " I accept this price. ",
        declineWording: " I do not accept this price. ",
      },
    })
    assert.equal(document.coverLine, "Interior painting, scheduled around your week.")
    assert.deepEqual(document.photos, [{ id: "front", caption: "Front porch", src: "https://example.com/front.jpg" }])
    assert.deepEqual(document.testimonials, [
      { id: "lena", quote: "They left the house clean.", name: "Lena Ortiz", detail: "Portland" },
    ])
    assert.deepEqual(document.contractTerms, [
      "Work starts after the deposit.",
      "Color changes after the start are a change order.",
    ])
    assert.equal(document.acceptWording, "I accept this price.")
    assert.equal(document.declineWording, "I do not accept this price.")
    assert.deepEqual(
      proposalPageList(document).map((page) => page.label),
      ["Cover", "Scope", "Photos", "Testimonials", "Terms", "Signature"],
    )
  })

  it("resolves built-in reusable templates for interior, exterior, and cabinets & specialty painting", () => {
    const interior = proposalDocument(DEFAULT_ESTIMATE_SETTINGS, "interior")
    const exterior = proposalDocument(DEFAULT_ESTIMATE_SETTINGS, "exterior")
    const cabinets = proposalDocument(DEFAULT_ESTIMATE_SETTINGS, "cabinets")

    assert.equal(interior.template.label, "Interior Painting")
    assert.deepEqual(interior.template.preparation, DEFAULT_PROPOSAL_TEMPLATES.interior.preparation)

    assert.equal(exterior.template.label, "Exterior Painting")
    assert.deepEqual(exterior.template.preparation, DEFAULT_PROPOSAL_TEMPLATES.exterior.preparation)

    assert.equal(cabinets.template.label, "Cabinets & Specialty Painting")
    assert.deepEqual(cabinets.template.preparation, DEFAULT_PROPOSAL_TEMPLATES.cabinets.preparation)
  })

  it("allows contractors to customize and save their own scope, prep, materials, exclusions, warranty, and payment terms per template", () => {
    const document = proposalDocument(
      {
        ...DEFAULT_ESTIMATE_SETTINGS,
        proposalPages: {
          templates: {
            cabinets: {
              scopeOverview: "Custom HVLP shop-sprayed cabinet refinishing.",
              preparation: "- Remove doors and hardware\n- Degrease and scuff-sand\n- Spray two coats of bonding primer",
              materials: "- Renner 2K polyurethane enamel\n- Stain-blocking primer",
              exclusions: "- Inside of cabinet boxes\n- New hinges",
              warranty: "Custom 3-year cabinet finish warranty.",
              paymentTerms: "40% deposit to reserve shop dates, 60% upon reinstallation.",
            },
          },
        },
      },
      "cabinets",
    )

    assert.equal(document.template.label, "Cabinets & Specialty Painting")
    assert.equal(document.template.scopeOverview, "Custom HVLP shop-sprayed cabinet refinishing.")
    assert.deepEqual(document.template.preparation, [
      "Remove doors and hardware",
      "Degrease and scuff-sand",
      "Spray two coats of bonding primer",
    ])
    assert.deepEqual(document.template.materials, [
      "Renner 2K polyurethane enamel",
      "Stain-blocking primer",
    ])
    assert.deepEqual(document.template.exclusions, [
      "Inside of cabinet boxes",
      "New hinges",
    ])
    assert.equal(document.template.warranty, "Custom 3-year cabinet finish warranty.")
    assert.equal(document.template.paymentTerms, "40% deposit to reserve shop dates, 60% upon reinstallation.")
    // Interior and Exterior remain untouched when only Cabinets is customized
    assert.equal(document.templates.interior.scopeOverview, DEFAULT_PROPOSAL_TEMPLATES.interior.scopeOverview)
    assert.equal(document.templates.exterior.scopeOverview, DEFAULT_PROPOSAL_TEMPLATES.exterior.scopeOverview)
  })

  it("extracts customer-visible scheduled products and coat counts while hiding hidden surfaces and Prep lines", () => {
    const products = scheduledProductsFromAreas([
      {
        name: "Primary Bedroom",
        surfaces: [
          { clientLabel: "Walls", productName: "Emerald Matte", coatCount: 2, showCoats: true },
          { clientLabel: "Baseboards", productName: "ProClassic Enamel", coatCount: 2, showCoats: true },
          { clientLabel: "Prep", productName: "Prep", coatCount: 1, showCoats: false },
          { clientLabel: "Hidden Closet", productName: "Secret Paint", coatCount: 2, hideFromCustomer: true },
        ],
      },
    ])

    assert.deepEqual(products, [
      { productName: "Emerald Matte", details: ["Primary Bedroom: Walls (2 coats)"] },
      { productName: "ProClassic Enamel", details: ["Primary Bedroom: Baseboards (2 coats)"] },
    ])
  })

  it("renders contractor logo on cover when present, shows company name without broken image when absent, and never substitutes the Scopepipe logo", async () => {
    const state = createSeedState()
    const estimate = state.estimates.find((item) => item.id === "est-ortiz")!
    const validPngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    // 1. Contractor uploaded logo in Settings
    const withLogoHtml = renderProposalHtml({
      estimate,
      clientName: "Ortiz Property Group",
      companyName: "Cascade Painting Co.",
      paymentMethods: PAYMENT_METHODS,
      estimateSettings: { ...state.estimateSettings, companyName: "Cascade Painting Co.", logoUrl: validPngDataUrl },
      origin: "https://www.scopepipe.com",
    })
    assert.equal(withLogoHtml.includes(`src="${validPngDataUrl}"`), true)
    assert.equal(withLogoHtml.includes("Cascade Painting Co."), true)
    assert.equal(withLogoHtml.includes("scopepipe-logo"), false)

    // 2. Empty logoUrl in estimateSettings does not overwrite a valid logoUrl in estimate.settings
    const fallbackToEstimateLogo = await resolveCompanyLogoDataUrl({
      estimateSettings: { ...state.estimateSettings, logoUrl: "" },
      estimate: { ...estimate, settings: { ...estimate.settings, logoUrl: validPngDataUrl } },
    })
    assert.equal(fallbackToEstimateLogo, validPngDataUrl)

    // 3. Broken remote logo URL returns undefined so no broken <img> is rendered
    const brokenLogo = await resolveCompanyLogoDataUrl({
      estimateSettings: { ...state.estimateSettings, logoUrl: "http://127.0.0.1:1/missing-logo.png" },
      estimate,
    })
    assert.equal(brokenLogo, undefined)

    // 4. No logo exists -> displays company name without an <img> tag on cover
    const noLogoHtml = renderProposalHtml({
      estimate: { ...estimate, settings: { ...estimate.settings, logoUrl: "" } },
      clientName: "Ortiz Property Group",
      companyName: "Cascade Painting Co.",
      paymentMethods: PAYMENT_METHODS,
      estimateSettings: { ...state.estimateSettings, companyName: "Cascade Painting Co.", logoUrl: "" },
      origin: "https://www.scopepipe.com",
    })
    assert.equal(noLogoHtml.includes('<img src='), false)
    assert.equal(noLogoHtml.includes("Cascade Painting Co."), true)
    assert.equal(noLogoHtml.includes("scopepipe-logo"), false)
  })

  it("shows 'Review and sign online' with the /p/[token] link before acceptance, and only shows an actual signature after acceptance", () => {
    const state = createSeedState()
    const unaccepted = state.estimates.find((item) => item.id === "est-ortiz")!
    assert.notEqual(unaccepted.clientStatus, "accepted")

    // Before acceptance: no prefilled cursive signature; shows "Review and sign online" + /p/[token] link
    const beforeHtml = renderProposalHtml({
      estimate: unaccepted,
      clientName: "Alex Ortiz",
      companyName: "Cascade Painting Co.",
      paymentMethods: PAYMENT_METHODS,
      estimateSettings: { ...state.estimateSettings, companyName: "Cascade Painting Co." },
      origin: "https://www.scopepipe.com",
    })
    assert.equal(beforeHtml.includes('class="signature-cursive"'), false)
    assert.equal(beforeHtml.includes('data-testid="signature-accepted"'), false)
    assert.equal(beforeHtml.includes('data-testid="signature-online-prompt"'), true)
    assert.equal(beforeHtml.includes("Review and sign online"), true)
    assert.equal(beforeHtml.includes(`https://www.scopepipe.com/p/${unaccepted.publicToken}`), true)

    // Homeowner accepts online via /p/[token] with a drawn electronic signature
    const drawnSig =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    const acceptedResult = applyAcceptance(state, unaccepted.publicToken, {
      signedName: "Alex Ortiz",
      signaturePayload: drawnSig,
      signedAt: "2026-11-09T20:00:00.000Z",
      selectedLineIds: ["ortiz-trim"],
    })
    assert.equal(acceptedResult.ok, true)
    if (!acceptedResult.ok) return
    const acceptedEstimate = acceptedResult.state.estimates.find((item) => item.id === "est-ortiz")!

    // After acceptance: shows the homeowner's actual signature and hides the unsigned prompt
    const afterHtml = renderProposalHtml({
      estimate: acceptedEstimate,
      clientName: "Alex Ortiz",
      companyName: "Cascade Painting Co.",
      paymentMethods: PAYMENT_METHODS,
      estimateSettings: { ...state.estimateSettings, companyName: "Cascade Painting Co." },
      origin: "https://www.scopepipe.com",
    })
    assert.equal(afterHtml.includes('data-testid="signature-accepted"'), true)
    assert.equal(afterHtml.includes(`src="${drawnSig}"`), true)
    assert.equal(afterHtml.includes("Signed by Alex Ortiz"), true)
    assert.equal(afterHtml.includes('data-testid="signature-online-prompt"'), false)
  })
})
