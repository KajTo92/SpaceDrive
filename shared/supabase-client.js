import { createClient } from "@supabase/supabase-js";

const env = import.meta.env || {};
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.warn("Space Drive: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.");
}

export const supabase = createClient(url || "https://invalid.supabase.co", publishableKey || "missing-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  realtime: { params: { eventsPerSecond: 10 } }
});

export function assertSupabaseConfigured() {
  if (!url || !publishableKey) throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.");
}

export async function currentProfile() {
  assertSupabaseConfigured();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return data;
}

export async function requireRole(roles, loginUrl = "/login.html") {
  const profile = await currentProfile();
  if (!profile) {
    location.replace(`${loginUrl}?next=${encodeURIComponent(location.pathname)}`);
    throw new Error("Authentication required");
  }
  if (!roles.includes(profile.role)) {
    const destination = profile.role === "admin" ? "/admin/" : profile.role === "driver" ? "/driver/" : "/passenger/";
    location.replace(destination);
    throw new Error("Access denied");
  }
  return profile;
}

export async function signOut() {
  await supabase.auth.signOut();
  location.replace("/login.html");
}
