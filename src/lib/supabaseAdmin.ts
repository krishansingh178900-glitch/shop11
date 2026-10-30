import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseServiceRoleKey && process.env.NODE_ENV === "development") {
  console.warn(
    "[Supabase Admin] Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Server-side admin operations will fail."
  );
}

// Admin / Server-side Supabase client (only use in API routes or Server Actions, never expose to browser)
export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co",
  supabaseServiceRoleKey || "placeholder-service-role-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
