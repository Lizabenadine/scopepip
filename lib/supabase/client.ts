"use client"

import { createBrowserClient } from "@supabase/ssr"
import { supabaseBrowserUrl, supabasePublishableKey } from "./env"

export const createClient = () => {
  return createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
}
