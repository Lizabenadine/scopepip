import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { sendProposalEmail } from "./send.ts"
import { moneyExact } from "../format.ts"
import { proposalFigures } from "./figures.ts"
import { customerLineIds, proposalMail } from "./mail.ts"

describe("proposalMail", () => {
  it("writes the client link and the customer price into the email and the PDF", () => {
    const state = createSeedState()
    const estimate = state.estimates.find((item) => item.id === "est-ortiz")
    const client = state.clients.find((item) => item.id === estimate?.clientId)
    assert.ok(estimate && client)
    const mail = proposalMail({
      estimate,
      clientName: client.name,
      clientEmail: client.email,
      language: "en",
      companyName: state.estimateSettings.companyName,
      paymentMethods: state.paymentMethods,
      origin: "https://office.example",
    })
    assert.ok(!("error" in mail))
    if ("error" in mail) return
    const quote = proposalFigures(estimate, state.paymentMethods, customerLineIds(estimate))
    const pdf = new TextDecoder().decode(mail.pdf)
    assert.match(mail.text, /https:\/\/office\.example\/p\/[a-z0-9]+\n/)
    assert.match(mail.text, /The PDF of this proposal is attached/)
    assert.match(mail.text, new RegExp(moneyExact(quote.quote.total).replace(/[$.]/g, "\\$&")))
    assert.match(pdf, /^%PDF-1\.4/)
    assert.match(pdf, /%%EOF\n$/)
    assert.match(pdf, /Trim package/)
    assert.match(pdf, /Pressure washing/)
    assert.equal(pdf.includes("Accent wall"), false)
    assert.equal(pdf.includes("Semi-gloss enamel on all trim"), false)
    assert.equal(pdf.includes("laborCost"), false)
    assert.equal(mail.filename, "proposal.pdf")
  })

  it("uses the Spanish link and a PDF encoding for an accented name", () => {
    const state = createSeedState()
    const estimate = state.estimates.find((item) => item.id === "est-ortiz")
    assert.ok(estimate)
    const mail = proposalMail({
      estimate,
      clientName: "José Ortiz",
      clientEmail: "jose@example.com",
      language: "es",
      companyName: "PB Painting",
      paymentMethods: state.paymentMethods,
      origin: "https://office.example",
    })
    assert.ok(!("error" in mail))
    if ("error" in mail) return
    assert.match(mail.subject, /^Propuesta para /)
    assert.match(mail.text, /https:\/\/office\.example\/p\/[a-z0-9]+\?lang=es/)
    assert.match(mail.text, /El PDF de esta propuesta va adjunto/)
    const pdf = new TextDecoder().decode(mail.pdf)
    assert.match(pdf, /Jos\\351 Ortiz/)
    assert.match(pdf, /T\\351rminos/)
  })

  it("refuses a client with no email", () => {
    const state = createSeedState()
    const estimate = state.estimates.find((item) => item.id === "est-ortiz")
    assert.ok(estimate)
    const mail = proposalMail({
      estimate,
      clientName: "Alex",
      clientEmail: "",
      language: "en",
      companyName: "PB Painting",
      paymentMethods: state.paymentMethods,
      origin: "https://office.example",
    })
    assert.deepEqual(mail, { error: "Add an email on the client before this proposal can go to an inbox." })
  })

  it("keeps the proposal on the job when Resend is not saved", async () => {
    const previous = {
      resend: process.env.RESEND_API_KEY,
      from: process.env.FOLLOW_UP_FROM_EMAIL,
      keysPath: process.env.SEND_KEYS_PATH,
    }
    delete process.env.RESEND_API_KEY
    delete process.env.FOLLOW_UP_FROM_EMAIL
    process.env.SEND_KEYS_PATH = "/tmp/scopepipe-missing-proposal-keys.json"
    const result = await sendProposalEmail({
      to: "alex@example.com",
      subject: "Proposal for 900 Harbor Ave",
      body: "Open it here:\nhttps://office.example/p/abc123\n\nThe PDF of this proposal is attached.",
      pdf: new TextEncoder().encode("%PDF-1.4\n"),
    })
    assert.equal(result.delivery, "logged")
    assert.match(result.detail, /Add Resend on Integrations/)
    if (previous.resend === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = previous.resend
    if (previous.from === undefined) delete process.env.FOLLOW_UP_FROM_EMAIL
    else process.env.FOLLOW_UP_FROM_EMAIL = previous.from
    if (previous.keysPath === undefined) delete process.env.SEND_KEYS_PATH
    else process.env.SEND_KEYS_PATH = previous.keysPath
  })
})
