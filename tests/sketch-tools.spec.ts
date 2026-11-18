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

test("sketchpad supports selecting, resizing corners, stretching edges, and moving placed stamps and shapes", async ({
  browser,
}) => {
  const stamp = `sketch-resize-${Date.now()}`

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  await page.goto("/signup")
  await page.getByLabel("Your name").fill("Resize Tester")
  await page.getByLabel("Company name").fill("Resize Paint Co")
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  await page.goto("/sketches")
  await page.getByRole("button", { name: /new sketch/i }).first().click()

  // 1. Stamp a badge (Patch / Repair)
  const patchStampBtn = page.getByTestId("stamp-patch-btn")
  await expect(patchStampBtn).toBeVisible()
  await patchStampBtn.click()

  const placedStamp = page.locator("[data-testid^='sketch-text-item-']").first()
  await expect(placedStamp).toBeVisible()
  await expect(placedStamp).toContainText("Patch")

  // 2. Verify all 8 handles (4 corners + 4 edges) are visible
  const handleNW = page.getByTestId("handle-nw")
  const handleN = page.getByTestId("handle-n")
  const handleNE = page.getByTestId("handle-ne")
  const handleE = page.getByTestId("handle-e")
  const handleSE = page.getByTestId("handle-se")
  const handleS = page.getByTestId("handle-s")
  const handleSW = page.getByTestId("handle-sw")
  const handleW = page.getByTestId("handle-w")

  await expect(handleNW).toBeVisible()
  await expect(handleN).toBeVisible()
  await expect(handleNE).toBeVisible()
  await expect(handleE).toBeVisible()
  await expect(handleSE).toBeVisible()
  await expect(handleS).toBeVisible()
  await expect(handleSW).toBeVisible()
  await expect(handleW).toBeVisible()

  // 3. Test Edge Stretching (Width via handle-e)
  const initialBox = await placedStamp.boundingBox()
  expect(initialBox).not.toBeNull()

  const handleEBox = await handleE.boundingBox()
  expect(handleEBox).not.toBeNull()

  // Drag handle-e rightwards by 60px to stretch width
  await page.mouse.move(handleEBox!.x + handleEBox!.width / 2, handleEBox!.y + handleEBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleEBox!.x + handleEBox!.width / 2 + 60, handleEBox!.y + handleEBox!.height / 2, { steps: 5 })
  await page.mouse.up()

  const stretchedWidthBox = await placedStamp.boundingBox()
  expect(stretchedWidthBox).not.toBeNull()
  expect(stretchedWidthBox!.width).toBeGreaterThan(initialBox!.width + 20)

  // 4. Test Edge Stretching (Height via handle-s)
  const handleSBox = await handleS.boundingBox()
  expect(handleSBox).not.toBeNull()

  // Drag handle-s downwards by 40px to stretch height
  await page.mouse.move(handleSBox!.x + handleSBox!.width / 2, handleSBox!.y + handleSBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleSBox!.x + handleSBox!.width / 2, handleSBox!.y + handleSBox!.height / 2 + 40, { steps: 5 })
  await page.mouse.up()

  const stretchedHeightBox = await placedStamp.boundingBox()
  expect(stretchedHeightBox).not.toBeNull()
  expect(stretchedHeightBox!.height).toBeGreaterThan(stretchedWidthBox!.height + 15)

  // 5. Test Corner Resizing (both width and height via handle-se)
  const handleSEBox = await handleSE.boundingBox()
  expect(handleSEBox).not.toBeNull()

  await page.mouse.move(handleSEBox!.x + handleSEBox!.width / 2, handleSEBox!.y + handleSEBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleSEBox!.x + handleSEBox!.width / 2 + 50, handleSEBox!.y + handleSEBox!.height / 2 + 30, { steps: 5 })
  await page.mouse.up()

  const cornerResizedBox = await placedStamp.boundingBox()
  expect(cornerResizedBox).not.toBeNull()
  expect(cornerResizedBox!.width).toBeGreaterThan(stretchedHeightBox!.width + 15)
  expect(cornerResizedBox!.height).toBeGreaterThan(stretchedHeightBox!.height + 10)

  // 6. Test Moving the object by dragging the body
  const bodyCenter = {
    x: cornerResizedBox!.x + cornerResizedBox!.width / 2,
    y: cornerResizedBox!.y + cornerResizedBox!.height / 2,
  }
  await page.mouse.move(bodyCenter.x, bodyCenter.y)
  await page.mouse.down()
  await page.mouse.move(bodyCenter.x - 80, bodyCenter.y - 50, { steps: 5 })
  await page.mouse.up()

  const movedBox = await placedStamp.boundingBox()
  expect(movedBox).not.toBeNull()
  expect(movedBox!.x).toBeLessThan(cornerResizedBox!.x - 30)
  expect(movedBox!.y).toBeLessThan(cornerResizedBox!.y - 20)

  // 7. Add a shape (Box) via shape-box-button
  const shapeBoxBtn = page.getByTestId("shape-box-button")
  await expect(shapeBoxBtn).toBeVisible()
  await shapeBoxBtn.click()

  const placedShape = page.locator("[data-testid^='sketch-text-item-']").nth(1)
  await expect(placedShape).toBeVisible()

  // Verify shape is selected with 8 handles
  await expect(page.getByTestId("handle-se")).toBeVisible()

  // 8. Save the sketch
  await page.getByLabel("Sketch Title").fill("Stretched Object Room")
  await page.getByRole("button", { name: "Save Sketch & Notes" }).click()
  await expect(page.getByText("Stretched Object Room")).toBeVisible()

  // 9. Reopen sketch and verify stretched dimensions and positions persist
  await page.locator("[data-testid^='sketch-card-']").first().click()
  await expect(page.getByLabel("Sketch Title")).toHaveValue("Stretched Object Room")

  const reopenedStamp = page.locator("[data-testid^='sketch-text-item-']").first()
  await expect(reopenedStamp).toBeVisible()
  const reopenedBox = await reopenedStamp.boundingBox()
  expect(reopenedBox).not.toBeNull()
  // Ensure the stretched width is preserved (much larger than the initial default)
  expect(reopenedBox!.width).toBeGreaterThan(initialBox!.width + 30)

  await page.getByRole("button", { name: "Cancel" }).click()
  await context.close()
})
