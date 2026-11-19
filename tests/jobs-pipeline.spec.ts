import { expect, test } from "@playwright/test"

test("Jobs Pipeline: column renaming saves permanently and job deletion with confirmation", async ({
  browser,
}) => {
  const stamp = `pipeline-${Date.now()}`
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  // 1. Sign up a new contractor account
  await page.goto("/signup")
  await page.getByLabel("Your name").fill("Pipeline Tester")
  await page.getByLabel("Company name").fill("Summit Finishers")
  await page.getByLabel("Email").fill(`${stamp}@scopepipe.test`)
  await page.getByLabel("Password").fill("password1")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // 2. Navigate to Jobs Pipeline (/dispatch)
  await page.goto("/dispatch")
  await expect(page).toHaveURL(/\/dispatch/)

  // 3. Test Column Renaming
  const renameLink = page.getByTestId("rename-column-project_accepted")
  await expect(renameLink).toBeVisible()
  await renameLink.click()

  const renameInput = page.getByTestId("rename-input-project_accepted")
  await expect(renameInput).toBeVisible()
  await renameInput.fill("Ready for Crew")

  const saveBtn = page.getByTestId("save-column-project_accepted")
  await expect(saveBtn).toBeVisible()
  await saveBtn.click()

  // Confirm column label updated
  const columnLabel = page.getByTestId("column-label-project_accepted")
  await expect(columnLabel).toHaveText("Ready for Crew")

  // Reload page to verify column rename persists permanently
  await page.reload()
  await expect(page.getByTestId("column-label-project_accepted")).toHaveText("Ready for Crew")

  // 4. Test Job Deletion with Confirmation Warning
  // Verify Harbor Dental is present on the Jobs Pipeline
  await expect(page.getByText("Harbor Dental")).toBeVisible()

  // Find the Actions button for this job card
  const actionsBtn = page.locator("button[aria-label='Deal actions for Harbor Dental']")
  await actionsBtn.scrollIntoViewIfNeeded()
  await expect(actionsBtn).toBeVisible()
  await actionsBtn.click()

  // Actions menu should show Delete option
  const deleteMenuItem = page.locator("button[role='menuitem']").filter({ hasText: /^Delete$/ })
  await deleteMenuItem.scrollIntoViewIfNeeded()
  await expect(deleteMenuItem).toBeVisible()
  await deleteMenuItem.click()

  // Confirmation warning dialog should appear
  const dialog = page.locator("[role='dialog']")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("Delete Job")).toBeVisible()
  await expect(dialog.getByText(/Are you sure you want to delete the job for/i)).toBeVisible()
  await expect(dialog.getByText("Harbor Dental")).toBeVisible()

  // Click Delete inside dialog
  const confirmDeleteBtn = dialog.getByRole("button", { name: "Delete" })
  await expect(confirmDeleteBtn).toBeVisible()
  await confirmDeleteBtn.click()

  // Harbor Dental should be gone from the pipeline
  await expect(page.getByText("Harbor Dental")).not.toBeVisible()

  // Other columns/jobs still operational and renamed column preserved
  await expect(page.getByTestId("column-label-project_accepted")).toHaveText("Ready for Crew")
})
