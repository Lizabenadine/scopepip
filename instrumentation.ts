export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const marker = globalThis as { __scopepipeQuoteDrip?: boolean }
  if (marker.__scopepipeQuoteDrip) return
  marker.__scopepipeQuoteDrip = true
  const { runAllQuoteDrips } = await import("./lib/follow-ups/drip-run")
  const tick = () => {
    void runAllQuoteDrips().catch(() => undefined)
  }
  tick()
  setInterval(tick, 15 * 60 * 1000)
}
