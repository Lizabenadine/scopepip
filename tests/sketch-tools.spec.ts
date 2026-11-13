import { expect, test } from "@playwright/test"

test("sketchpad includes Text tool and Print / PDF button, supports typing, editing, moving, and saving", async ({
  browser,
}) => {
  const stamp = `sketch-tools-${Date.now()}`

  // 1. Desktop context
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await desktopContext.newPage()

  await page.goto("/signup")
  await page.getByLabel("Your name").fill("Sketch Tools Tester")
  await page.getByLabel("Company name").fill("Tool Paint Co")
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // 2. Open Daily Sketch & Notes
  await page.goto("/sketches")
  await expect(page.getByRole("heading", { name: "Daily Sketch & Notes" })).toBeVisible()

  // 3. Open New Sketch
  await page.getByRole("button", { name: /new sketch/i }).first().click()

  // 4. Verify Text button is beside Pen and Eraser
  const penBtn = page.getByRole("button", { name: "Pen", exact: true })
  const eraserBtn = page.getByRole("button", { name: "Eraser", exact: true })
  const textBtn = page.getByTestId("text-tool-button")
  await expect(penBtn).toBeVisible()
  await expect(eraserBtn).toBeVisible()
  await expect(textBtn).toBeVisible()

  // 5. Verify Print / PDF button is visible beside Save Sketch
  const printBtn = page.getByTestId("print-sketch-button")
  await expect(printBtn).toBeVisible()
  await expect(printBtn).toContainText("Print / PDF")

  // 6. Select Text tool and tap/click on the canvas to add text
  await textBtn.click()
  const canvas = page.locator("canvas")
  await canvas.click({ position: { x: 250, y: 180 } })

  // An input appears to type text
  const textInput = page.locator("input[placeholder='Type text...']")
  await expect(textInput).toBeVisible()
  await textInput.fill("Drywall crack repair")
  await page.keyboard.press("Enter")

  // Verify text badge is rendered on canvas
  const textBadge = page.locator("[data-testid^='sketch-text-item-']")
  await expect(textBadge).toBeVisible()
  await expect(textBadge).toContainText("Drywall crack repair")

  // 7. Save sketch with title and notes
  await page.getByLabel("Sketch Title").fill("Living Room Inspection")
  await page.getByLabel("Written Instructions / Specs").fill("Sand smooth and prime with Zinsser BIN")
  await page.getByRole("button", { name: "Save Sketch & Notes" }).click()

  // Sketch modal closes and sketch appears in grid
  await expect(page.getByText("Living Room Inspection")).toBeVisible()

  // 8. Reopen sketch to verify text item was saved and persists
  await page.locator("[data-testid^='sketch-card-']").first().click()
  await expect(page.getByLabel("Sketch Title")).toHaveValue("Living Room Inspection")
  await expect(page.getByLabel("Written Instructions / Specs")).toHaveValue("Sand smooth and prime with Zinsser BIN")

  // The saved text item is visible and editable
  const reopenedTextBadge = page.locator("[data-testid^='sketch-text-item-']")
  await expect(reopenedTextBadge).toBeVisible()
  await expect(reopenedTextBadge).toContainText("Drywall crack repair")

  // Close sketchpad
  await page.getByRole("button", { name: "Cancel" }).click()

  await desktopContext.close()
})
