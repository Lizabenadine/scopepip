import fs from "node:fs"
import path from "node:path"
import { expect, test } from "@playwright/test"

const localChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if (fs.existsSync(localChromePath)) {
  test.use({ launchOptions: { executablePath: localChromePath } })
}

test("existing estimate in a >5MB account book saves via single-estimate PATCH, reloads intact, and sends cleanly", async ({
  page,
}) => {
  const stamp = `save-413-${Date.now()}`
  await page.goto("/signup")
  await page.getByLabel("Your name").fill("Save Test Owner")
  await page.getByLabel("Company name").fill(`Save Test ${stamp}`)
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // Create first saved estimate (will hold >5 MB of historical estimate data).
  await page.goto("/estimate")
  await page.getByRole("textbox", { name: "Client", exact: true }).fill("Archive Client")
  await page.getByTestId("open-templates").click()
  await page.getByTestId("add-bedroom").click()
  await page.getByRole("button", { name: "Save to Lead" }).click()
  await expect(page).toHaveURL(/\/estimates\/.+/)

  // Create second saved estimate with real room dimensions (14 x 12 x 8).
  await page.goto("/estimate")
  await page.getByRole("textbox", { name: "Client", exact: true }).fill("Maya Lin")
  await page.getByLabel("Email").fill("maya@example.com")
  await page.getByTestId("open-templates").click()
  await page.getByTestId("add-bedroom").click()
  await page.getByText("Edit room").first().click()
  await page.locator("input[id$='-length']").first().fill("14")
  await page.locator("input[id$='-width']").first().fill("12")
  await page.locator("input[id$='-height']").first().fill("8")
  await page.getByRole("button", { name: "Save to Lead" }).click()
  await expect(page).toHaveURL(/\/estimates\/.+/)
  const targetUrl = page.url()
  const targetId = targetUrl.split("/estimates/")[1]!.split("?")[0]!

  // Inflate the first estimate in the persisted account book on disk past 5 MB uncompressed JSON
  // (replicating the multi-year company book payload that triggered HTTP 413 on PUT /api/account/book).
  const booksDir = path.join(process.cwd(), "data", "e2e", "books")
  const bookFiles = fs.readdirSync(booksDir).filter((file) => file.endsWith(".json"))
  let targetFile: string | null = null
  let latestMtime = 0
  for (const file of bookFiles) {
    const full = path.join(booksDir, file)
    const stat = fs.statSync(full)
    if (stat.mtimeMs > latestMtime) {
      latestMtime = stat.mtimeMs
      targetFile = full
    }
  }
  expect(targetFile).toBeTruthy()
  const book = JSON.parse(fs.readFileSync(targetFile!, "utf8")) as {
    revision: number
    state: {
      estimates: Array<{ id: string; notes: string }>
    }
  }
  const archiveEst = book.state.estimates.find((est) => est.id !== targetId)
  expect(archiveEst).toBeTruthy()
  archiveEst!.notes = "Historic proposal snapshot data. ".repeat(200_000)
  fs.writeFileSync(targetFile!, JSON.stringify(book))
  expect(fs.statSync(targetFile!).size).toBeGreaterThan(5_000_000)

  const patchStatuses: number[] = []
  const putRequests: string[] = []
  const getConfirmUrls: string[] = []
  page.on("response", (response) => {
    const url = response.url()
    if (response.request().method() === "PATCH" && url.includes("/api/account/book/estimate")) {
      patchStatuses.push(response.status())
    }
    if (response.request().method() === "PUT" && url.endsWith("/api/account/book")) {
      putRequests.push(url)
    }
    if (response.request().method() === "GET" && url.includes("/api/account/book/estimate?id=")) {
      getConfirmUrls.push(url)
    }
  })

  // Reload to hydrate the >5 MB book from the server, then verify saved dimensions remained intact.
  await page.reload()
  await expect(page.getByRole("textbox", { name: "Client", exact: true })).toHaveValue("Maya Lin")
  await page.getByText("Edit room").first().click()
  await expect(page.locator("input[id$='-length']").first()).toHaveValue("14")
  await expect(page.locator("input[id$='-width']").first()).toHaveValue("12")
  await expect(page.locator("input[id$='-height']").first()).toHaveValue("8")

  // Add a newly added room and confirm blank dimensions + zero calculations while keeping existing room dimensions.
  await page.getByTestId("add-room-name").fill("Sunroom Addition")
  await page.getByTestId("add-room-button").click()
  expect(await page.locator("input[id$='-length']").last().inputValue()).toBe("")
  expect(await page.locator("input[id$='-width']").last().inputValue()).toBe("")
  expect(await page.locator("input[id$='-height']").last().inputValue()).toBe("")
  await expect(page.getByTestId("area-measures").last()).toContainText(
    "0 sq ft walls · 0 sq ft ceiling · 0 ln ft trim · 0 gal",
  )
  await expect(page.locator("input[id$='-length']").first()).toHaveValue("14")

  // Edit client name, client note, and add a custom line item.
  await page.getByRole("textbox", { name: "Client", exact: true }).fill("Maya Lin-Updated")
  await page.locator("#client-note").fill("Confirmed two-coat eggshell finish")
  await page.getByRole("button", { name: "Custom" }).click()
  const lineNames = page.locator("section").filter({ hasText: "Line items" }).getByLabel("Name")
  await lineNames.last().fill("Foyer scaffolding")

  // Save via primary Save button and confirm PATCH 200 without PUT or error banner.
  await page.getByRole("button", { name: /^Save$/ }).first().click()
  await expect.poll(() => patchStatuses.length).toBeGreaterThan(0)
  expect(patchStatuses.every((code) => code === 200)).toBe(true)
  expect(putRequests).toEqual([])
  await expect(page.getByText(/Could not save this estimate/i)).toHaveCount(0)

  // Reload page and confirm all edits + preserved room dimensions remain persisted.
  await page.reload()
  await expect(page.getByRole("textbox", { name: "Client", exact: true })).toHaveValue("Maya Lin-Updated")
  await expect(page.locator("#client-note")).toHaveValue("Confirmed two-coat eggshell finish")
  await page.getByText("Edit room").first().click()
  await expect(page.locator("input[id$='-length']").first()).toHaveValue("14")
  await expect(page.getByText("Sunroom Addition").first()).toBeVisible()
  await expect(
    page.locator("section").filter({ hasText: "Line items" }).getByLabel("Name").last(),
  ).toHaveValue("Foyer scaffolding")

  // Verify Send estimate confirms server record before sending and delivers updated clientName.
  let emailedClient = ""
  await page.route("**/api/proposals/*/email", async (route) => {
    const body = route.request().postDataJSON() as { email?: string; clientName?: string }
    emailedClient = body.clientName ?? ""
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        delivery: "sent",
        id: "e2e-email-id",
        publicUrl: "http://localhost:3000/p/test",
      }),
    })
  })
  await page.getByRole("button", { name: "Send estimate" }).click()
  await expect.poll(() => emailedClient).toBe("Maya Lin-Updated")
  expect(getConfirmUrls.some((url) => url.includes(`id=${encodeURIComponent(targetId)}`))).toBe(true)
  await expect(page.getByTestId("send-estimate-status")).toContainText(/The job is in Estimate Sent/i)
})
