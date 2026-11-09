import { createSeedState } from "../lib/data/seed.ts"
import { htmlPdf } from "../lib/proposals/htmlPdf.ts"
import { renderProposalHtml } from "../lib/proposals/renderHtml.ts"
import type { Estimate, EstimateSettings, ProductionRate } from "../lib/types.ts"
import { mkdirSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

async function main() {
  const state = createSeedState()
  const baseEstimate = state.estimates.find((e) => e.id === "est-maya")
  if (!baseEstimate) {
    console.error("Estimate not found")
    process.exit(1)
  }

  // Build custom rates matching the approved Standard Interior Proposal sample specs
  const customRates: ProductionRate[] = state.productionRates.map((rate) => {
    if (rate.id === "walls") {
      return {
        ...rate,
        productCostPerGallon: 0,
        productName: "SW Cashmere Eggshell",
        clientDescription: "Walls painted the full number of coats. Cut clean lines at ceiling and trim.",
      }
    }
    if (rate.id === "ceiling") {
      return {
        ...rate,
        productCostPerGallon: 0,
        productName: "SW ProMar Ceiling Flat",
        clientDescription: "Ceiling painted the full number of coats in ultra-flat ceiling white.",
      }
    }
    if (rate.id === "baseboards") {
      return {
        ...rate,
        productCostPerGallon: 0,
        productName: "SW Emerald Urethane Semi-Gloss",
        clientDescription: "Baseboards and window/door casings scuff-sanded and brushed the full number of coats.",
      }
    }
    if (rate.id === "door-frame") {
      return {
        ...rate,
        productCostPerGallon: 0,
        productName: "SW Emerald Urethane Semi-Gloss",
        clientDescription: "Door slab and frame painted with urethane trim enamel.",
      }
    }
    if (rate.id === "window-frames") {
      return {
        ...rate,
        productCostPerGallon: 0,
        productName: "SW Emerald Urethane Semi-Gloss",
        clientDescription: "Interior wood window sashes and sills prepped and finished.",
      }
    }
    return { ...rate, productCostPerGallon: 0 }
  })

  // Add a custom rate for Primary Suite walls in SW Emerald Interior Matte
  customRates.push({
    ...state.productionRates.find((r) => r.id === "walls")!,
    id: "walls-matte",
    productCostPerGallon: 0,
    productName: "SW Emerald Interior Matte",
    clientDescription: "Walls painted the full number of coats in washable matte finish.",
  })

  // Add a custom rate for Primary Suite baseboards description
  customRates.push({
    ...state.productionRates.find((r) => r.id === "baseboards")!,
    id: "baseboards-primary",
    productCostPerGallon: 0,
    productName: "SW Emerald Urethane Semi-Gloss",
    clientDescription: "Baseboards brushed the full number of coats.",
  })

  // Sample/Demo Proposal ONLY: use the actual Scopepipe blue & charcoal logo and brand colors
  const scopePipeLogoBytes = readFileSync(resolve(process.cwd(), "public/scopepipe-logo.png"))
  const scopePipeLogoDataUrl = `data:image/png;base64,${scopePipeLogoBytes.toString("base64")}`

  const sampleSettings: EstimateSettings = {
    ...state.estimateSettings,
    hourlyRate: 100,
    hourRounding: 0,
    priceRounding: "none",
    taxPercent: 0,
    minimumJobCharge: 0,
    financingEnabled: false,
    companyName: "ScopePipe",
    logoUrl: scopePipeLogoDataUrl,
    brandColor: "#0284c7",
    companyLicense: "CCB #218490 · Licensed, Bonded & Insured",
    businessPhone: "(503) 555-0194",
    companyEmail: "estimates@scopepipe.com",
    expiryDays: 30,
    depositPercent: 30,
    paymentMethodId: "ach",
    proposalPages: {
      coverLine: "Complete interior preparation and two-coat finish schedule, tailored for your home.",
      templates: {
        interior: {
          scopeOverview:
            "Supply labor, floor and furniture protection, surface preparation, and two finish coats of Sherwin-Williams interior coatings on all rooms and surfaces itemized below.",
          preparation: [
            "Cover hardwood floors, stairs, and walkways with rosin paper and canvas drop cloths.",
            "Mask countertops, cabinetry, built-ins, and interior hardware with 3M painter's tape and plastic film.",
            "Remove switch and outlet plates; mask light fixtures and label hardware for reinstallation.",
            "Patch nail holes, drywall dings, and stress cracks with lightweight spackle; sand flush and spot-prime.",
            "Caulk open gaps along baseboards, window casings, and door frames with elastomeric acrylic caulk.",
          ].join("\n"),
          materials: [
            "Walls: Sherwin-Williams Cashmere Interior Acrylic Latex (Low Lustre / Eggshell).",
            "Ceilings: Sherwin-Williams ProMar Ceiling Flat White.",
            "Trim, Doors & Baseboards: Sherwin-Williams Emerald Urethane Trim Enamel (Semi-Gloss).",
          ].join("\n"),
          exclusions: [
            "Closet interiors, laundry room, and basement stairwell unless specifically listed in the scope.",
            "Skim-coating textured walls or repairing active water/plumbing leaks.",
            "Moving pianos, aquariums, or wall-mounted televisions (please unhook prior to arrival).",
          ].join("\n"),
          warranty:
            "3-Year Interior Workmanship Warranty: All scheduled interior surfaces are warranted against peeling, blistering, or flaking due to defective application for 3 years from completion.",
          paymentTerms:
            "30% deposit due upon proposal acceptance to reserve your start date. The remaining 70% balance is due upon final walkthrough and completion.",
        },
      },
    },
  }

  const sampleEstimate: Estimate = {
    ...baseEstimate,
    id: "est-sample-interior",
    title: "Main Level Interior Repaint",
    jobAddress: "2840 NW Laurelhurst Dr, Portland, OR",
    salesperson: "Jordan Hale · Senior Estimator",
    estimateKind: "interior",
    rates: customRates,
    settings: sampleSettings,
    crewNote: "INTERNAL CREW ONLY: Lock box code 9921 - never show on proposal",
    areas: [
      {
        id: "room-living",
        name: "Living & Dining Room",
        areaType: "room",
        lengthFt: 22,
        widthFt: 16,
        heightFt: 9,
        colorName: "Alabaster",
        colorCode: "SW 7008",
        sheen: "Eggshell",
        prepLevel: "light",
        prepHours: 1,
        crewNote: "INTERNAL CREW ONLY: Watch antique chandelier",
        surfaces: [
          { id: "s-liv-walls", rateId: "walls", coatCount: 2, itemCount: 0, quantityOverride: null, hoursOverride: 8.2, crewNote: "" },
          { id: "s-liv-ceil", rateId: "ceiling", coatCount: 2, itemCount: 0, quantityOverride: null, hoursOverride: 5.125, crewNote: "" },
          { id: "s-liv-base", rateId: "baseboards", coatCount: 2, itemCount: 0, quantityOverride: null, hoursOverride: 4.1, crewNote: "" },
          { id: "s-liv-door", rateId: "door-frame", coatCount: 2, itemCount: 2, quantityOverride: null, hoursOverride: 2.4, crewNote: "" },
        ],
      },
      {
        id: "room-primary",
        name: "Primary Suite Bedroom",
        areaType: "room",
        lengthFt: 16,
        widthFt: 15,
        heightFt: 9,
        colorName: "Repose Gray",
        colorCode: "SW 7015",
        sheen: "Matte",
        prepLevel: "light",
        prepHours: 1,
        crewNote: "INTERNAL CREW ONLY: Homeowner works from home until 10am",
        surfaces: [
          { id: "s-pri-walls", rateId: "walls-matte", coatCount: 2, itemCount: 0, quantityOverride: null, hoursOverride: 4.9, crewNote: "" },
          { id: "s-pri-base", rateId: "baseboards-primary", coatCount: 2, itemCount: 0, quantityOverride: null, hoursOverride: 2.625, crewNote: "" },
          { id: "s-pri-win", rateId: "window-frames", coatCount: 2, itemCount: 3, quantityOverride: null, hoursOverride: 2.1, crewNote: "" },
        ],
      },
    ],
    lineItems: [
      {
        id: "line-wainscot",
        label: "Foyer Wainscoting & Crown Molding",
        clientNote: "Prep, prime, and apply two finish coats of SW Emerald Urethane Enamel on entry wainscoting panels.",
        crewNote: "INTERNAL CREW ONLY: Use fine finish roller",
        mode: "custom",
        hours: 0,
        units: 0,
        pricePerUnit: 0,
        customPrice: 480,
        workOrderHours: 4,
        hiddenOnWorkOrder: false,
        materials: [],
        optional: false,
        selected: true,
      },
      {
        id: "line-accent",
        label: "Optional Dining Room Accent Wall (SW Naval 6244)",
        clientNote: "Two coats of deep-base primer and two finish coats in SW Naval Matte on north dining wall.",
        crewNote: "INTERNAL CREW ONLY: Deep tint base",
        mode: "custom",
        hours: 0,
        units: 0,
        pricePerUnit: 0,
        customPrice: 325,
        workOrderHours: 3,
        hiddenOnWorkOrder: false,
        materials: [],
        optional: true,
        selected: true,
      },
    ],
  }

  const html = renderProposalHtml({
    estimate: sampleEstimate,
    clientName: "Sarah & Mark Jenkins",
    clientEmail: "sarah.jenkins@example.com",
    language: "en",
    companyName: sampleSettings.companyName,
    companyEmail: sampleSettings.companyEmail,
    paymentMethods: state.paymentMethods,
    estimateSettings: sampleSettings,
  })

  const pdf = await htmlPdf({
    estimate: sampleEstimate,
    clientName: "Sarah & Mark Jenkins",
    clientEmail: "sarah.jenkins@example.com",
    language: "en",
    companyName: sampleSettings.companyName,
    companyEmail: sampleSettings.companyEmail,
    paymentMethods: state.paymentMethods,
    estimateSettings: sampleSettings,
    html,
  })

  const outPath1 = "/Users/nadieshda/.gemini/antigravity/brain/a99b3355-6761-438d-9a23-486a6d919bb8/html-proposal.pdf"
  const outPath2 = "/Users/nadieshda/.gemini/antigravity/brain/a99b3355-6761-438d-9a23-486a6d919bb8/sample-interior-proposal.pdf"
  writeFileSync(outPath1, Buffer.from(pdf))
  writeFileSync(outPath2, Buffer.from(pdf))
  console.log("HTML-PDF written to", outPath1, "and", outPath2)

  // Verify real contractor proposal branding (custom brand color + professional company name when no logo is uploaded)
  const contractorSettings: EstimateSettings = {
    ...sampleSettings,
    companyName: "Summit Ridge Painting Co.",
    logoUrl: "",
    brandColor: "#7f1d1d",
    companyLicense: "WA Lic #SUMMIRP801KZ · Bonded & Insured",
    businessPhone: "(206) 555-0148",
    companyEmail: "bids@summitridgepainting.com",
  }
  const contractorEstimate: Estimate = {
    ...sampleEstimate,
    salesperson: "Marcus Vance · Owner & Estimator",
    settings: contractorSettings,
  }
  const contractorPdf = await htmlPdf({
    estimate: contractorEstimate,
    clientName: "Sarah & Mark Jenkins",
    clientEmail: "sarah.jenkins@example.com",
    language: "en",
    companyName: contractorSettings.companyName,
    companyEmail: contractorSettings.companyEmail,
    paymentMethods: state.paymentMethods,
    estimateSettings: contractorSettings,
  })
  const scratchDir = "/Users/nadieshda/.gemini/antigravity/brain/a99b3355-6761-438d-9a23-486a6d919bb8/scratch"
  mkdirSync(scratchDir, { recursive: true })
  const contractorOutPath = `${scratchDir}/contractor-branding-verify.pdf`
  writeFileSync(contractorOutPath, Buffer.from(contractorPdf))
  console.log("Contractor verification PDF written to", contractorOutPath)
}

main()
