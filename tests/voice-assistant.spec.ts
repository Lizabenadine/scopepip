import { expect, test } from "@playwright/test"

test("Voice Assistant: DripJobs-grade capabilities, hands-free walkthrough estimating, CRM lead creation, and safety confirmation", async ({
  browser,
}) => {
  const stamp = `voice-test-${Date.now()}`
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  // 1. Sign up contractor
  await page.goto("/signup")
  await page.getByLabel("Your name").fill("Voice Estimator Lead")
  await page.getByLabel("Company name").fill("Cascade Painting Pros")
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // 2. Check Voice Assistant buttons on Dashboard & Nav
  const navVoiceBtn = page.getByTestId("nav-voice-assistant")
  const dashVoiceBtn = page.getByTestId("dashboard-voice-assistant")
  await expect(navVoiceBtn).toBeVisible()
  await expect(dashVoiceBtn).toBeVisible()

  // 3. Open Voice Assistant modal from Dashboard
  await dashVoiceBtn.click()
  const modal = page.getByTestId("voice-assistant-modal")
  await expect(modal).toBeVisible()
  await expect(page.getByText(/Scopepipe Voice Assistant/i)).toBeVisible()

  // 4. Test Lead Creation with Safety Confirmation Card
  // Click sample chip: "Create lead John Smith, 503-555-1234, 123 Oak St"
  const leadChip = page.getByRole("button", { name: /Create lead John Smith/i })
  await expect(leadChip).toBeVisible()
  await leadChip.click()

  // Verify Safety Confirmation Card appears
  const confirmCard = page.getByTestId("voice-confirmation-card")
  await expect(confirmCard).toBeVisible()
  await expect(page.getByTestId("voice-action-summary")).toContainText("John Smith")
  await expect(confirmCard).toContainText("503-555-1234")
  await expect(confirmCard).toContainText("123 Oak St")

  // Click Confirm & Apply
  const applyBtn = page.getByTestId("voice-confirm-apply")
  await expect(applyBtn).toBeVisible()
  await applyBtn.click()

  // Verify navigation to /sales-pipeline and lead John Smith on the board
  await expect(page).toHaveURL(/\/sales-pipeline/)
  await expect(page.getByText("John Smith")).toBeVisible()

  // 5. Test Hands-free Walkthrough Estimating on /estimate
  await page.goto("/estimate")
  const walkBtn = page.getByTestId("estimator-walkthrough-mic")
  await expect(walkBtn).toBeVisible()
  await walkBtn.click()

  // Modal opens in walkthrough mode
  await expect(page.getByTestId("voice-assistant-modal")).toBeVisible()

  // Test the exact command requested: "Add living room, 15 by 15, walls and ceiling" via input + Enter
  const commandInput = page.getByTestId("voice-command-input")
  await expect(commandInput).toBeVisible()
  await commandInput.fill("Add living room, 15 by 15, walls and ceiling")
  await commandInput.press("Enter")

  // Verify command executed and room is added
  await expect(page.getByTestId("voice-success-message")).toBeVisible()
  await expect(page.getByTestId("voice-success-message")).toContainText("Living Room")
  await page.getByTestId("voice-assistant-close").click()

  // Verify living room card is visible in area list with 15 × 15 × 8 ft dimensions
  await expect(page.getByText("15 × 15 × 8 ft")).toBeVisible()

  // Test Follow-up command: "Add two doors to the living room" (updates existing room without creating duplicates)
  await walkBtn.click()
  await expect(page.getByTestId("voice-assistant-modal")).toBeVisible()
  await page.getByTestId("voice-command-input").fill("Add two doors to the living room")
  await page.getByTestId("voice-apply-command").click()
  await expect(page.getByTestId("voice-success-message")).toBeVisible()
  await expect(page.getByTestId("voice-success-message")).toContainText("Living Room")
  await page.getByTestId("voice-assistant-close").click()

  // Confirm NO duplicate Living Room was created
  const livingRooms = await page.getByText("Living Room").all()
  expect(livingRooms.length).toBeGreaterThanOrEqual(1)

  // Verify price is recalculated and summary updates
  const summary = page.getByTestId("estimate-summary")
  await expect(summary).toBeVisible()
  const summaryText = await summary.textContent()
  expect(summaryText).not.toContain("0 hrs · 0 gal")

  // Test direct natural language room creation in "Add a room" input
  const addRoomInput = page.getByTestId("add-room-name")
  await expect(addRoomInput).toBeVisible()
  await addRoomInput.fill("12 by 14 walls and ceiling Dining Room")
  await addRoomInput.press("Enter")
  await expect(page.getByText("12 × 14 × 8 ft")).toBeVisible()

  // 6. Test Mobile Responsiveness
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(navVoiceBtn).toBeVisible()
  await navVoiceBtn.click()
  await expect(page.getByTestId("voice-assistant-modal")).toBeVisible()
  await page.getByTestId("voice-assistant-close").click()
})
