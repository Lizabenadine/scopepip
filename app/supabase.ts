import { createClient } from "@supabase/supabase-js";

const fallbackUrl = "https://kavebhnmcdeptnpdlotz.supabase.co";
const fallbackKey = "sb_publishable_euTo9d4gKJaV3PSuXw3oHg_k_Sy4Tl4";

function projectUrl(value: string | undefined) {
  const raw = (value ?? "").trim().replace(/^['"]|['"]$/g, "");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallbackUrl;
    if (!url.hostname.includes(".")) return fallbackUrl;
    return url.origin;
  } catch {
    return fallbackUrl;
  }
}

function publishableKey(value: string | undefined) {
  const key = (value ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!key || key.startsWith("http")) return fallbackKey;
  return key;
}

export const supabase = createClient(
  projectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  publishableKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);
