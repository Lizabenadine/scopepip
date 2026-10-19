import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://kavebhnmcdeptnpdlotz.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_euTo9d4gKJaV3PSuXw3oHg_k_Sy4Tl4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
