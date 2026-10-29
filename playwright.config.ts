import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

const dataDir = path.join(process.cwd(), "data", "e2e")
const authSecret = "e2e-scopepipe-auth-secret"

export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      NEXT_DIST_DIR: ".next-e2e",
      AUTH_SECRET: authSecret,
      ACCOUNTS_PATH: path.join(dataDir, "accounts.json"),
      BOOKS_DIR: path.join(dataDir, "books"),
      AUTH_SECRET_PATH: path.join(dataDir, "auth-secret"),
      SEND_KEYS_PATH: path.join(dataDir, "send-keys.json"),
      NEXT_PUBLIC_SUPABASE_URL: "",
      SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_SECRET_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
