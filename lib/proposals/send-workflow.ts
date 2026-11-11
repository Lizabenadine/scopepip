export interface SavedEstimateRef {
  id: string
  clientId: string
  publicToken: string
}

export type SendEstimateWorkflowResult =
  | { ok: true; saved: SavedEstimateRef; message: string }
  | { ok: false; stage: "save" | "email"; reason: string }

/**
 * Runs the Save & Send estimate sequence: saves local edits first, confirms the
 * proposal record exists on the server before emailing, and notifies onSentSuccess
 * only when the email actually sends.
 */
export async function runSendEstimateWorkflow(input: {
  persistLocal: () => SavedEstimateRef | null
  confirmServerSave: (estimateId: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  onConfirmedSave?: (saved: SavedEstimateRef) => void
  sendEmail: (saved: SavedEstimateRef) => Promise<{ ok: true; message: string } | { ok: false; reason: string }>
  onSentSuccess?: (saved: SavedEstimateRef) => Promise<void> | void
}): Promise<SendEstimateWorkflowResult> {
  const saved = input.persistLocal()
  if (!saved) {
    return {
      ok: false,
      stage: "save",
      reason: "Could not save this estimate. Check required fields and try again.",
    }
  }

  const confirmed = await input.confirmServerSave(saved.id)
  if (!confirmed.ok) {
    return {
      ok: false,
      stage: "save",
      reason: confirmed.reason,
    }
  }

  input.onConfirmedSave?.(saved)

  const emailed = await input.sendEmail(saved)
  if (!emailed.ok) {
    return {
      ok: false,
      stage: "email",
      reason: emailed.reason,
    }
  }

  await input.onSentSuccess?.(saved)
  return {
    ok: true,
    saved,
    message: emailed.message,
  }
}
