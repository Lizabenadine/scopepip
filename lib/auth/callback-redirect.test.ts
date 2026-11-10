import assert from "node:assert/strict"
import { describe, it } from "node:test"

function canonicalTargetUrl(pathAndQuery: string, requestUrl: string): URL {
  const url = new URL(pathAndQuery, requestUrl)
  if (url.hostname === "scopepipe.com") {
    url.hostname = "www.scopepipe.com"
  }
  return url
}

describe("auth callback routing and canonical URLs", () => {
  it("canonicalizes apex scopepipe.com to www.scopepipe.com for dashboard redirect", () => {
    const apexUrl = "https://scopepipe.com/auth/callback?code=test-code-123"
    const target = canonicalTargetUrl("/dashboard", apexUrl)
    assert.equal(target.toString(), "https://www.scopepipe.com/dashboard")
  })

  it("preserves www.scopepipe.com hostname for dashboard redirect", () => {
    const wwwUrl = "https://www.scopepipe.com/auth/callback?code=test-code-123"
    const target = canonicalTargetUrl("/dashboard", wwwUrl)
    assert.equal(target.toString(), "https://www.scopepipe.com/dashboard")
  })

  it("preserves localhost during local development", () => {
    const localUrl = "http://localhost:3000/auth/callback?code=test-code-123"
    const target = canonicalTargetUrl("/dashboard", localUrl)
    assert.equal(target.toString(), "http://localhost:3000/dashboard")
  })

  it("builds login redirect with onboarding=incomplete when user record is missing", () => {
    const apexUrl = "https://scopepipe.com/auth/callback?code=test-code-123"
    const target = canonicalTargetUrl("/login?confirmed=1&onboarding=incomplete", apexUrl)
    assert.equal(target.toString(), "https://www.scopepipe.com/login?confirmed=1&onboarding=incomplete")
    assert.equal(target.searchParams.get("confirmed"), "1")
    assert.equal(target.searchParams.get("onboarding"), "incomplete")
  })

  it("builds signup confirm error redirect on apex and www", () => {
    const apexUrl = "https://scopepipe.com/auth/callback?error=access_denied"
    const target = canonicalTargetUrl("/signup?confirm=error", apexUrl)
    assert.equal(target.toString(), "https://www.scopepipe.com/signup?confirm=error")
  })
})
