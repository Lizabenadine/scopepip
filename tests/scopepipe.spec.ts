import { createHmac } from "node:crypto"
import { expect, test, type Page } from "@playwright/test"

const AUTH_SECRET = "e2e-scopepipe-auth-secret"
const SLATE_50 = "rgb(248, 250, 252)"
const WHITE = "rgb(255, 255, 255)"

test.describe("Scopepipe", () => {
  test("signup confirmation goes to verify-email, and the estimator stays behind sign-in", async ({ page }) => {
    const errors = collectErrors(page)
    await page.route("**/api/auth/signup", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, confirmEmail: true }),
      })
    })
    await page.goto("/signup")
    await page.getByLabel("Your name").fill("E2E Owner")
    await page.getByLabel("Company name").fill("E2E Painting")
    await page.getByLabel("Email").fill("confirm@scopepipe.test")
    await page.getByLabel("Password").fill("password1")
    await page.getByRole("button", { name: "Create account" }).click()
    await expect(page).toHaveURL(/\/verify-email\?email=confirm%40scopepipe\.test/)
    await expect(page.getByTestId("verify-email")).toContainText("confirm@scopepipe.test")
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible()

    await page.goto("/estimate")
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "New estimate" })).toHaveCount(0)
    expect(seriousErrors(errors)).toEqual([])
  })

  test("dashboard shows white cards on the slate background", async ({ page }) => {
    const errors = collectErrors(page)
    await signUp(page, "dashboard")
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
    const shell = page.locator(".min-h-dvh")
    await expect(shell).toBeVisible()
    expect(await shell.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(SLATE_50)
    const card = page.locator("article").first()
    await expect(card).toBeVisible()
    await expect(card).toHaveClass(/bg-white/)
    expect(await card.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(WHITE)
    await expect(page.getByRole("heading", { name: "Lead" })).toBeVisible()
    expect(seriousErrors(errors)).toEqual([])
  })

  test("a new estimate prices a room, a line item, and a public proposal link", async ({ page }) => {
    const errors = collectErrors(page)
    await signUp(page, "estimate")
    await page.goto("/estimate")
    await expect(page.getByRole("heading", { name: "New estimate" })).toBeVisible()
    await page.getByRole("textbox", { name: "Client", exact: true }).fill("E2E Painter")
    await page.getByTestId("open-templates").click()
    await page.getByTestId("add-bedroom").click()
    await expect(page.getByLabel("Area")).toHaveValue("Bedroom")
    const price = page.locator(".text-price").first()
    const bedroomTotal = await price.innerText()
    expect(bedroomTotal).toMatch(/^\$\d/)
    await page.getByRole("button", { name: "Hourly Rate" }).click()
    await expect(page.getByLabel("Name")).toHaveValue("Hourly work")
    await expect(price).not.toHaveText(bedroomTotal)
    await page.getByRole("button", { name: "Save to Lead" }).click()
    await expect(page).toHaveURL(/\/estimates\/.+/)
    await page.getByRole("link", { name: "Proposal" }).click()
    await expect(page.getByText("E2E Painter")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Bedroom" })).toBeVisible()
    await expect(page.getByText("Hourly work").first()).toBeVisible()
    const clientLink = page.getByRole("link", { name: "Client link" })
    await expect(clientLink).toHaveAttribute("href", /\/p\/[a-z0-9]+/)
    await clientLink.click()
    await expect(page).toHaveURL(/\/p\/[a-z0-9]+/)
    await expect(page.getByTestId("proposal-total")).toBeVisible()
    await expect(page.getByText("Bedroom").first()).toBeVisible()
    expect(seriousErrors(errors)).toEqual([])
  })

  test("billing renders, and an expired trial leaves the estimator", async ({ page, context }) => {
    const errors = collectErrors(page)
    await context.addCookies([officeCookie(trialSession("e2e-trial", "trialing", "2099-01-01T00:00:00.000Z"))])
    await page.goto("/billing")
    await expect(page.getByTestId("billing-plan")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible()
    await expect(page.getByTestId("billing-status")).toContainText(/trial/i)

    await context.clearCookies()
    await context.addCookies([officeCookie(trialSession("e2e-expired", "canceled", "2020-01-01T00:00:00.000Z"))])
    await page.goto("/estimate")
    await expect(page).toHaveURL(/\/billing$/)
    await expect(page.getByRole("heading", { name: "New estimate" })).toHaveCount(0)
    await expect(page.getByTestId("billing-plan")).toBeVisible()
    expect(seriousErrors(errors)).toEqual([])
  })
})

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  return errors
}

function seriousErrors(errors: string[]): string[] {
  return errors.filter((error) => !/favicon|Download the React DevTools|lemon\.js|Failed to load resource/i.test(error))
}

async function signUp(page: Page, label: string) {
  const stamp = `${label}-${Date.now()}`
  await page.goto("/signup")
  await page.getByLabel("Your name").fill("E2E Owner")
  await page.getByLabel("Company name").fill(`E2E ${label}`)
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

function trialSession(id: string, status: "trialing" | "canceled", trialEndsAt: string) {
  return {
    id,
    name: "E2E Owner",
    email: `${id}@scopepipe.test`,
    role: "owner" as const,
    companyId: `${id}-company`,
    companyName: "E2E Painting",
    companySlug: id,
    subscriptionStatus: status,
    trialEndsAt,
  }
}

function officeCookie(session: ReturnType<typeof trialSession>) {
  const body = Buffer.from(JSON.stringify({ session, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url")
  const sig = createHmac("sha256", AUTH_SECRET).update(body).digest("base64url")
  return {
    name: "scopepipe_session",
    value: `v2.${body}.${sig}`,
    url: "http://localhost:3000",
    httpOnly: true,
    sameSite: "Lax" as const,
  }
}
