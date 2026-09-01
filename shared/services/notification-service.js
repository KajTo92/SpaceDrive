import { supabase } from "../supabase-client.js";

export async function getNotifications() {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  const { data, error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
