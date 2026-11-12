import fs from "node:fs"
import { expect, test } from "@playwright/test"

const localChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if (fs.existsSync(localChromePath)) {
  test.use({ launchOptions: { executablePath: localChromePath } })
}

test("client proposal layout is strictly isolated, mobile-friendly, downloadable, signable, payable, and blocks IDOR", async ({
  browser,
}) => {
  const contractorContext = await browser.newContext()
  const contractorPage = await contractorContext.newPage()
  const stamp = `prop-iso-${Date.now()}`

  await contractorPage.goto("/signup")
  await contractorPage.getByLabel("Your name").fill("Contractor Owner")
  await contractorPage.getByLabel("Company name").fill("Cascade Coat Co")
  await contractorPage.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await contractorPage.getByLabel("Password").fill("password1")
  await contractorPage.getByRole("button", { name: "Create account" }).click()
  await expect(contractorPage).toHaveURL(/\/dashboard/)

  // Create two distinct customer estimates to verify client A cannot reach client B.
  await contractorPage.goto("/estimate")
  await contractorPage.getByRole("textbox", { name: "Client", exact: true }).fill("Customer Beta Secret")
  await contractorPage.getByTestId("open-templates").click()
  await contractorPage.getByTestId("add-bedroom").click()
  await contractorPage.getByRole("button", { name: "Save to Lead" }).click()
  await expect(contractorPage).toHaveURL(/\/estimates\/.+/)
  const otherEstimateId = contractorPage.url().split("/estimates/")[1]!.split("?")[0]!

  await contractorPage.goto("/estimate")
  await contractorPage.getByRole("textbox", { name: "Client", exact: true }).fill("Alice Homeowner")
  await contractorPage.getByLabel("Email").fill("alice@homeowner.test")
  await contractorPage.getByTestId("open-templates").click()
  await contractorPage.getByTestId("add-bedroom").click()
  await contractorPage.getByRole("button", { name: "Hourly Rate" }).click()
  await contractorPage.getByRole("button", { name: "Save to Lead" }).click()
  await expect(contractorPage).toHaveURL(/\/estimates\/.+/)
  const targetEstimateId = contractorPage.url().split("/estimates/")[1]!.split("?")[0]!

  await contractorPage.getByRole("link", { name: "Proposal" }).click()
  const clientHref = await contractorPage.getByRole("link", { name: "Client link" }).getAttribute("href")
  expect(clientHref).toMatch(/^\/p\/[a-z0-9_-]+$/i)
  const proposalToken = clientHref!.split("/p/")[1]!
  expect(proposalToken).not.toBe(targetEstimateId)
  await contractorContext.close()

  // Fresh anonymous homeowner context at iPhone mobile viewport (390x844).
  const clientContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const clientPage = await clientContext.newPage()
  const contractorApiCalls: string[] = []
  clientPage.on("request", (req) => {
    const pathname = new URL(req.url()).pathname
    if (
      pathname.startsWith("/api/auth/session") ||
      pathname.startsWith("/api/account/") ||
      pathname.startsWith("/api/bookings") ||
      pathname.startsWith("/api/proposals/events")
    ) {
      contractorApiCalls.push(`${req.method()} ${pathname}`)
    }
  })

  await clientPage.goto(clientHref!)
  await expect(clientPage.getByTestId("client-proposal-shell")).toBeVisible()
  await expect(clientPage.getByTestId("client-brand-logo")).toBeVisible()
  await expect(clientPage.getByTestId("proposal-page-cover").getByText("Alice Homeowner")).toBeVisible()
  await expect(clientPage.getByTestId("contact-contractor")).toContainText("Questions? Contact Your Contractor")

  // Zero contractor nav links or marketing homepage links.
  await expect(clientPage.locator('a[href="/"]')).toHaveCount(0)
  await expect(clientPage.locator('a[href="/dashboard"]')).toHaveCount(0)
  await expect(clientPage.locator('a[href="/sales-pipeline"]')).toHaveCount(0)
  await expect(clientPage.locator('a[href="/estimate"]')).toHaveCount(0)
  await expect(clientPage.locator('a[href="/settings"]')).toHaveCount(0)
  await expect(clientPage.locator('a[href="/payments"]')).toHaveCount(0)
  await expect(clientPage.locator('a[href="/login"]')).toHaveCount(0)
  expect(contractorApiCalls).toEqual([])

  // Mobile layout has zero horizontal overflow.
  const hasHorizontalOverflow = await clientPage.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(hasHorizontalOverflow).toBe(false)

  // Server blocks payment intent before proposal acceptance.
  const preSignIntent = await clientPage.request.post("/api/payments/create-intent", {
    data: { token: proposalToken },
  })
  expect(preSignIntent.status()).toBe(403)

  // Download proposal PDF works cleanly via token.
  const prePdfRes = await clientPage.request.get(`/api/public/proposals/${encodeURIComponent(proposalToken)}/pdf`)
  expect(prePdfRes.status()).toBe(200)
  expect(prePdfRes.headers()["content-type"]).toContain("application/pdf")
  const prePdfBuf = await prePdfRes.body()
  expect(prePdfBuf.subarray(0, 5).toString("utf8")).toBe("%PDF-")

  // Client signs and accepts the proposal.
  await clientPage.getByLabel("Legal name").fill("Alice Homeowner")
  await clientPage.getByTestId("accept-proposal").click()

  // Post-signing confirmation appears with PDF download, token payment link, and contact contractor option.
  const confirmation = clientPage.getByTestId("proposal-signed-confirmation")
  await expect(confirmation).toBeVisible()
  await expect(confirmation).toContainText("Proposal Accepted & Signed")
  await expect(clientPage.getByTestId("confirmation-download-pdf")).toHaveAttribute(
    "href",
    `/api/public/proposals/${proposalToken}/pdf`,
  )
  const payLink = clientPage.getByTestId("confirmation-pay-deposit")
  await expect(payLink).toHaveAttribute("href", `/p/${proposalToken}/pay`)

  // Signed PDF download works via token.
  const signedPdfRes = await clientPage.request.get(`/api/public/proposals/${encodeURIComponent(proposalToken)}/pdf`)
  expect(signedPdfRes.status()).toBe(200)
  expect(signedPdfRes.headers()["content-type"]).toContain("application/pdf")

  // Navigate to isolated token payment page and pay test deposit.
  await payLink.click()
  await expect(clientPage).toHaveURL(`/p/${proposalToken}/pay`)
  await expect(clientPage.getByTestId("client-brand-logo")).toBeVisible()
  await expect(clientPage.getByTestId("back-to-invoice")).toHaveCount(0)
  await expect(clientPage.getByTestId("back-to-proposal")).toHaveAttribute("href", `/p/${proposalToken}`)
  await clientPage.getByTestId("pay-deposit").click()
  await clientPage.getByTestId("card-number").fill("4242 4242 4242 4242")
  await clientPage.getByTestId("card-expiry").fill("12/28")
  await clientPage.getByTestId("card-cvc").fill("123")
  await clientPage.getByTestId("submit-payment").click()
  await expect(clientPage.getByTestId("deposit-status")).toContainText("Deposit Paid / Scheduled")

  // Reloading the signed proposal keeps the customer isolated to only their signed proposal and payment status.
  await clientPage.goto(`/p/${proposalToken}`)
  await expect(clientPage.getByTestId("proposal-signed-confirmation")).toBeVisible()
  await expect(clientPage.getByTestId("proposal-signed-confirmation")).toContainText("Proposal Accepted & Signed")
  await expect(clientPage.getByText("Customer Beta Secret")).toHaveCount(0)

  // Server-enforced IDOR and permission checks:
  // 1) Invalid, tampered, or other-customer-ID proposal tokens rejected.
  for (const badToken of ["tamperedtoken999", otherEstimateId, `${proposalToken.slice(0, -4)}xxxx`]) {
    await clientPage.goto(`/p/${badToken}`)
    await expect(clientPage.getByText("This proposal link is not valid")).toBeVisible()
    await expect(clientPage.getByText("Customer Beta Secret")).toHaveCount(0)
    expect((await clientPage.request.get(`/api/public/proposals/${badToken}`)).status()).toBe(404)
    expect((await clientPage.request.get(`/api/public/proposals/${badToken}/pdf`)).status()).toBe(404)
  }

  // 2) Client navigating to contractor dashboard, estimator, or another customer's estimate hits sign-in, not internal/customer data.
  for (const blockedPath of [
    "/dashboard",
    "/sales-pipeline",
    "/estimate",
    `/estimates/${otherEstimateId}`,
    `/proposal/${otherEstimateId}`,
    `/estimates/${otherEstimateId}/pay`,
  ]) {
    await clientPage.goto(blockedPath)
    await expect(clientPage.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expect(clientPage.getByText("Customer Beta Secret")).toHaveCount(0)
  }

  // 3) Unauthenticated ID-based estimate APIs, internal contractor APIs, and unowned payment intents return 401.
  expect((await clientPage.request.get(`/api/public/estimates/${otherEstimateId}`)).status()).toBe(401)
  expect(
    (
      await clientPage.request.post(`/api/public/estimates/${otherEstimateId}/deposit`, {
        data: {
          paymentIntentId: "pi_forged",
          amount: 100,
          currency: "usd",
          depositPercent: 30,
          method: "card",
          paidAt: new Date().toISOString(),
        },
      })
    ).status(),
  ).toBe(401)
  expect((await clientPage.request.post("/api/payments/create-intent", { data: { estimateId: otherEstimateId } })).status()).toBe(401)
  expect((await clientPage.request.get("/api/account/book")).status()).toBe(401)
  expect((await clientPage.request.get("/api/bookings")).status()).toBe(401)
  expect((await clientPage.request.get("/api/proposals/events")).status()).toBe(401)

  await clientContext.close()

  // Verify contractor login still works and contractor sees signed proposal link.
  const reloginContext = await browser.newContext()
  const reloginPage = await reloginContext.newPage()
  await reloginPage.goto("/login")
  await reloginPage.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await reloginPage.getByLabel("Password").fill("password1")
  await reloginPage.getByRole("button", { name: "Sign in" }).click()
  await expect(reloginPage).toHaveURL(/\/dashboard/)
  await reloginPage.goto(`/proposal/${targetEstimateId}`)
  await expect(reloginPage.getByRole("link", { name: "Client link" })).toHaveAttribute(
    "href",
    `/p/${proposalToken}`,
  )
  await reloginContext.close()
})
