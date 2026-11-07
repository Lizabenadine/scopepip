import assert from "node:assert/strict"
import net from "node:net"
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
      companyName: "ScopePipe",
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
      companyName: "ScopePipe",
      paymentMethods: state.paymentMethods,
      origin: "https://office.example",
    })
    assert.deepEqual(mail, { error: "Add an email on the client before this proposal can go to an inbox." })
  })

  it("keeps the proposal on the job when neither SMTP nor Resend is saved", async () => {
    const previous = {
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      smtpFrom: process.env.SMTP_FROM,
      resend: process.env.RESEND_API_KEY,
      from: process.env.FOLLOW_UP_FROM_EMAIL,
      keysPath: process.env.SEND_KEYS_PATH,
    }
    delete process.env.SMTP_HOST
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
    delete process.env.SMTP_FROM
    delete process.env.RESEND_API_KEY
    delete process.env.FOLLOW_UP_FROM_EMAIL
    process.env.SEND_KEYS_PATH = "/tmp/scopepipe-missing-proposal-keys.json"
    try {
      const result = await sendProposalEmail({
        to: "alex@example.com",
        subject: "Proposal for 900 Harbor Ave",
        body: "Open it here:\nhttps://office.example/p/abc123\n\nThe PDF of this proposal is attached.",
        pdf: new TextEncoder().encode("%PDF-1.4\n"),
      })
      assert.equal(result.delivery, "logged")
      assert.match(result.detail, /Add the email key on Integrations/)
    } finally {
      if (previous.smtpHost === undefined) delete process.env.SMTP_HOST
      else process.env.SMTP_HOST = previous.smtpHost
      if (previous.smtpUser === undefined) delete process.env.SMTP_USER
      else process.env.SMTP_USER = previous.smtpUser
      if (previous.smtpPass === undefined) delete process.env.SMTP_PASS
      else process.env.SMTP_PASS = previous.smtpPass
      if (previous.smtpFrom === undefined) delete process.env.SMTP_FROM
      else process.env.SMTP_FROM = previous.smtpFrom
      if (previous.resend === undefined) delete process.env.RESEND_API_KEY
      else process.env.RESEND_API_KEY = previous.resend
      if (previous.from === undefined) delete process.env.FOLLOW_UP_FROM_EMAIL
      else process.env.FOLLOW_UP_FROM_EMAIL = previous.from
      if (previous.keysPath === undefined) delete process.env.SEND_KEYS_PATH
      else process.env.SEND_KEYS_PATH = previous.keysPath
    }
  })

  it("sends proposal link and attached PDF over SMTP with company sender name and Reply-To", async () => {
    let capturedAuth = ""
    let capturedMailFrom = ""
    let capturedRcptTo = ""
    let capturedData = ""

    const server = net.createServer((socket) => {
      socket.on("error", () => undefined)
      let inData = false
      let buf = ""
      socket.write("220 smtp.stackmail.com ESMTP ready\r\n")
      socket.on("data", (chunk: Buffer) => {
        buf += chunk.toString("utf8")
        if (inData) {
          const endIdx = buf.indexOf("\r\n.\r\n")
          if (endIdx !== -1) {
            capturedData = buf.slice(0, endIdx)
            buf = buf.slice(endIdx + 5)
            inData = false
            socket.write("250 2.0.0 OK: queued\r\n")
          }
          return
        }
        let nl = buf.indexOf("\r\n")
        while (nl !== -1) {
          const line = buf.slice(0, nl)
          buf = buf.slice(nl + 2)
          if (line.startsWith("EHLO")) {
            socket.write("250-smtp.stackmail.com\r\n250 AUTH PLAIN LOGIN\r\n")
          } else if (line.startsWith("AUTH PLAIN ")) {
            capturedAuth = line.slice("AUTH PLAIN ".length)
            socket.write("235 2.7.0 Authentication successful\r\n")
          } else if (line.startsWith("MAIL FROM:")) {
            capturedMailFrom = line
            socket.write("250 2.1.0 OK\r\n")
          } else if (line.startsWith("RCPT TO:")) {
            capturedRcptTo = line
            socket.write("250 2.1.5 OK\r\n")
          } else if (line === "DATA") {
            inData = true
            socket.write("354 End data with <CR><LF>.<CR><LF>\r\n")
            break
          } else if (line === "QUIT") {
            socket.write("221 2.0.0 Bye\r\n")
            socket.end()
          }
          nl = buf.indexOf("\r\n")
        }
      })
    })

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const addr = server.address() as net.AddressInfo

    const previous = {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      smtpFrom: process.env.SMTP_FROM,
      keysPath: process.env.SEND_KEYS_PATH,
    }
    process.env.SMTP_HOST = "127.0.0.1"
    process.env.SMTP_PORT = String(addr.port)
    process.env.SMTP_USER = "support@scopepipe.com"
    process.env.SMTP_PASS = "test-smtp-pass"
    process.env.SMTP_FROM = "support@scopepipe.com"
    process.env.SEND_KEYS_PATH = "/tmp/scopepipe-missing-proposal-keys.json"

    try {
      const pdfBytes = new TextEncoder().encode("%PDF-1.4\nTest proposal PDF\n%%EOF\n")
      const result = await sendProposalEmail({
        to: "alex@example.com",
        subject: "Proposal for 900 Harbor Ave",
        body: "Open it here:\nhttps://scopepipe.com/p/abc12345\n\nThe PDF of this proposal is attached.",
        pdf: pdfBytes,
        companyName: "Sunrise Painting Co",
        replyTo: "estimates@sunrisepainting.com",
      })
      assert.equal(result.delivery, "sent")
      assert.equal(
        Buffer.from(capturedAuth, "base64").toString("utf8"),
        "\0support@scopepipe.com\0test-smtp-pass",
      )
      assert.equal(capturedMailFrom, "MAIL FROM:<support@scopepipe.com>")
      assert.equal(capturedRcptTo, "RCPT TO:<alex@example.com>")
      assert.match(capturedData, /From: "Sunrise Painting Co" <support@scopepipe\.com>/)
      assert.match(capturedData, /Reply-To: <estimates@sunrisepainting\.com>/)
      assert.match(capturedData, /To: <alex@example\.com>/)
      assert.match(capturedData, /Subject: Proposal for 900 Harbor Ave/)
      assert.match(capturedData, /Content-Disposition: attachment; filename="proposal\.pdf"/)
      assert.ok(capturedData.includes(Buffer.from(pdfBytes).toString("base64")))
    } finally {
      server.close()
      if (previous.smtpHost === undefined) delete process.env.SMTP_HOST
      else process.env.SMTP_HOST = previous.smtpHost
      if (previous.smtpPort === undefined) delete process.env.SMTP_PORT
      else process.env.SMTP_PORT = previous.smtpPort
      if (previous.smtpUser === undefined) delete process.env.SMTP_USER
      else process.env.SMTP_USER = previous.smtpUser
      if (previous.smtpPass === undefined) delete process.env.SMTP_PASS
      else process.env.SMTP_PASS = previous.smtpPass
      if (previous.smtpFrom === undefined) delete process.env.SMTP_FROM
      else process.env.SMTP_FROM = previous.smtpFrom
      if (previous.keysPath === undefined) delete process.env.SEND_KEYS_PATH
      else process.env.SEND_KEYS_PATH = previous.keysPath
    }
  })

  it("reports failed (never sent) when the SMTP server rejects authentication", async () => {
    const server = net.createServer((socket) => {
      socket.on("error", () => undefined)
      socket.write("220 smtp.stackmail.com ESMTP ready\r\n")
      socket.on("data", (chunk: Buffer) => {
        const line = chunk.toString("utf8")
        if (line.startsWith("EHLO")) {
          socket.write("250-smtp.stackmail.com\r\n250 AUTH PLAIN LOGIN\r\n")
        } else if (line.startsWith("AUTH")) {
          socket.write("535 5.7.8 Authentication credentials invalid\r\n")
        }
      })
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const addr = server.address() as net.AddressInfo

    const previous = {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      keysPath: process.env.SEND_KEYS_PATH,
    }
    process.env.SMTP_HOST = "127.0.0.1"
    process.env.SMTP_PORT = String(addr.port)
    process.env.SMTP_USER = "support@scopepipe.com"
    process.env.SMTP_PASS = "wrong-pass"
    process.env.SEND_KEYS_PATH = "/tmp/scopepipe-missing-proposal-keys.json"

    try {
      const result = await sendProposalEmail({
        to: "alex@example.com",
        subject: "Proposal for 900 Harbor Ave",
        body: "Open it here:\nhttps://scopepipe.com/p/abc12345",
        pdf: new TextEncoder().encode("%PDF-1.4\n"),
      })
      assert.equal(result.delivery, "failed")
      assert.match(result.detail, /SMTP authentication failed \(535\)/)
    } finally {
      server.close()
      if (previous.smtpHost === undefined) delete process.env.SMTP_HOST
      else process.env.SMTP_HOST = previous.smtpHost
      if (previous.smtpPort === undefined) delete process.env.SMTP_PORT
      else process.env.SMTP_PORT = previous.smtpPort
      if (previous.smtpUser === undefined) delete process.env.SMTP_USER
      else process.env.SMTP_USER = previous.smtpUser
      if (previous.smtpPass === undefined) delete process.env.SMTP_PASS
      else process.env.SMTP_PASS = previous.smtpPass
      if (previous.keysPath === undefined) delete process.env.SEND_KEYS_PATH
      else process.env.SEND_KEYS_PATH = previous.keysPath
    }
  })

  it("populates job-specific measurements, coats, products, deposit, and custom contractor template sections into the PDF while keeping internal rates and crew notes private", () => {
    const state = createSeedState()
    const base = state.estimates.find((item) => item.id === "est-ortiz")
    const client = state.clients.find((item) => item.id === base?.clientId)
    assert.ok(base && client)

    const estimate = {
      ...base,
      estimateKind: "exterior" as const,
      crewNote: "Internal crew gate code 4491 - do not show customer",
      areas: base.areas.map((area) => ({
        ...area,
        colorName: "Alabaster",
        colorCode: "SW 7008",
        sheen: "Satin",
        crewNote: "Use 32ft ladder on north gable",
      })),
    }

    const customSettings = {
      ...state.estimateSettings,
      companyLicense: "Licensed, Bonded & Insured",
      businessPhone: "(503) 555-0140",
      companyEmail: "office@northwall.example.com",
      proposalPages: {
        templates: {
          exterior: {
            scopeOverview: "Complete exterior weatherproofing and repainting.",
            preparation: "Power wash all siding\nScrape and prime bare cedar",
            materials: "Duration Exterior Acrylic Latex",
            exclusions: "Detached garage and wood fence",
            warranty: "Custom 5-year exterior workmanship warranty.",
            paymentTerms: "30% deposit upon acceptance, 70% upon final walkthrough.",
          },
        },
      },
    }

    const mail = proposalMail({
      estimate,
      clientName: client.name,
      clientEmail: client.email,
      language: "en",
      companyName: "Northwall Paint",
      paymentMethods: state.paymentMethods,
      origin: "https://scopepipe.com",
      estimateSettings: customSettings,
    })

    assert.ok(!("error" in mail))
    if ("error" in mail) return
    const pdf = new TextDecoder().decode(mail.pdf)

    // Branding, template label, room dimensions, color/sheen, coats, and paint products
    assert.match(pdf, /Northwall Paint/)
    assert.match(pdf, /Licensed, Bonded & Insured/)
    assert.match(pdf, /office@northwall\.example\.com/)
    assert.match(pdf, /Exterior Painting/)
    assert.match(pdf, /Unit 4 \\\(22 x 18 x 8 ft\\\)/)
    assert.match(pdf, /Alabaster/)
    assert.match(pdf, /SW 7008/)
    assert.match(pdf, /Wall paint/)
    assert.match(pdf, /Trim paint/)

    // Custom contractor template sections
    assert.match(pdf, /Complete exterior weatherproofing and repainting\./)
    assert.match(pdf, /Power wash all siding/)
    assert.match(pdf, /Duration Exterior Acrylic Latex/)
    assert.match(pdf, /Detached garage and wood fence/)
    assert.match(pdf, /Custom 5-year exterior workmanship warranty\./)
    assert.match(pdf, /30% deposit upon acceptance, 70% upon final walkthrough\./)
    assert.match(pdf, /Deposit due \\\(30%\\\)/)
    assert.match(pdf, /Balance after the job/)

    // Strict privacy: never expose internal crew notes, hourly rates, or costs
    assert.equal(pdf.includes("4491"), false)
    assert.equal(pdf.includes("32ft ladder"), false)
    assert.equal(pdf.includes("sales rate"), false)
    assert.equal(pdf.includes("per hour"), false)
    assert.equal(pdf.includes("laborCost"), false)
    assert.equal(pdf.includes("grossProfit"), false)
  })
})
