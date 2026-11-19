import { expect, test } from "@playwright/test"

test("Sales Pipeline: lead editing, organized sections, delete confirmation, cancelation, and persistence", async ({
  browser,
}) => {
  const stamp = `sales-${Date.now()}`
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  // 1. Sign up a new contractor account
  await page.goto("/signup")
  await page.getByLabel("Your name").fill("Sales Pipeline Tester")
  await page.getByLabel("Company name").fill("Crown & Trim Co")
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // 2. Navigate to Sales Pipeline (/sales-pipeline)
  await page.goto("/sales-pipeline")
  await expect(page).toHaveURL(/\/sales-pipeline/)

  // 3. Verify lead card presence (Maya Chen)
  await expect(page.getByText("Maya Chen")).toBeVisible()

  // 4. Open Actions menu and verify organized sections
  const actionsBtn = page.locator("button[aria-label='Deal actions for Maya Chen']")
  await actionsBtn.scrollIntoViewIfNeeded()
  await expect(actionsBtn).toBeVisible()
  await actionsBtn.click()

  // Check section headers
  await expect(page.getByText("Lead Details")).toBeVisible()
  await expect(page.getByText("Pipeline").first()).toBeVisible()
  await expect(page.getByText("Communication & Notes")).toBeVisible()
  await expect(page.getByText("Manage").first()).toBeVisible()

  // Check Edit option is visible
  const editMenuItem = page.locator("button[role='menuitem']").filter({ hasText: /Edit \/ Rename Lead/ })
  await expect(editMenuItem).toBeVisible()
  await editMenuItem.click()

  // 5. Edit Dialog: update name, job title, phone, email, address
  const editDialog = page.locator("[role='dialog']")
  await expect(editDialog).toBeVisible()
  await expect(editDialog.getByText("Edit Lead")).toBeVisible()

  const nameInput = editDialog.locator("input[placeholder='Client or homeowner name']")
  await nameInput.fill("Maya Chen Renovated")

  const titleInput = editDialog.locator("input[placeholder*='Interior living room']")
  await titleInput.fill("Executive Suite Repaint")

  const phoneInput = editDialog.locator("input[placeholder='(555) 000-0000']")
  await phoneInput.fill("(503) 555-9988")

  const emailInput = editDialog.locator("input[placeholder='name@example.com']")
  await emailInput.fill("maya.renovated@example.com")

  const addressInput = editDialog.locator("input[placeholder='Street address, City, ST']")
  await addressInput.fill("789 Pine Ave, Portland, OR")

  // Save changes
  await editDialog.getByRole("button", { name: "Save Changes" }).click()

  // Confirm immediate UI update on the board
  await expect(page.getByText("Maya Chen Renovated")).toBeVisible()
  await expect(page.getByText("Executive Suite Repaint")).toBeVisible()
  await expect(page.getByText("(503) 555-9988")).toBeVisible()
  await expect(page.getByText("maya.renovated@example.com")).toBeVisible()
  await expect(page.getByText("789 Pine Ave, Portland, OR")).toBeVisible()

  // 6. Reload page to confirm edits persist permanently
  await page.reload()
  await expect(page.getByText("Maya Chen Renovated")).toBeVisible()
  await expect(page.getByText("Executive Suite Repaint")).toBeVisible()
  await expect(page.getByText("(503) 555-9988")).toBeVisible()
  await expect(page.getByText("maya.renovated@example.com")).toBeVisible()
  await expect(page.getByText("789 Pine Ave, Portland, OR")).toBeVisible()

  // 7. Test Delete: first Cancel, then confirm Deletion
  const actionsBtnUpdated = page.locator("button[aria-label='Deal actions for Maya Chen Renovated']")
  await actionsBtnUpdated.scrollIntoViewIfNeeded()
  await actionsBtnUpdated.click()

  const deleteMenuItem = page.locator("button[role='menuitem']").filter({ hasText: /^Delete$/ })
  await deleteMenuItem.scrollIntoViewIfNeeded()
  await expect(deleteMenuItem).toBeVisible()
  await deleteMenuItem.click()

  // Confirmation dialog appears
  const deleteDialog = page.locator("[role='dialog']")
  await expect(deleteDialog).toBeVisible()
  await expect(deleteDialog.getByText("Delete Lead")).toBeVisible()
  await expect(deleteDialog.getByText(/Are you sure you want to delete the lead for/i)).toBeVisible()
  await expect(deleteDialog.getByText("Maya Chen Renovated")).toBeVisible()

  // Test Cancel
  const cancelBtn = deleteDialog.getByRole("button", { name: "Cancel" })
  await cancelBtn.click()
  await expect(deleteDialog).not.toBeVisible()
  // Lead is still present
  await expect(page.getByText("Maya Chen Renovated")).toBeVisible()

  // Re-open and confirm deletion
  await actionsBtnUpdated.click()
  const deleteMenuItemAgain = page.locator("button[role='menuitem']").filter({ hasText: /^Delete$/ })
  await deleteMenuItemAgain.scrollIntoViewIfNeeded()
  await deleteMenuItemAgain.click()

  const confirmDeleteBtn = page.locator("[role='dialog']").getByRole("button", { name: "Delete" })
  await confirmDeleteBtn.click()

  // Lead is removed from board
  await expect(page.getByText("Maya Chen Renovated")).not.toBeVisible()

  // 8. Reload to confirm deleted lead does not return
  await page.reload()
  await expect(page.getByText("Maya Chen Renovated")).not.toBeVisible()
})
