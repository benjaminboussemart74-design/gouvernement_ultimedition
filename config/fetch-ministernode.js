// Minimal Supabase fetcher for minister nodes
// Uses ESM CDN import of supabase-js v2

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = window.SUPABASE_URL;
const supabaseKey = window.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchMinisterNodes() {
  const { data, error } = await supabase
    .from("vw_ministernode")
    .select("person_id, full_name, is_leader, ministry_name, color, photo_url")
    .order("is_leader", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.person_id,
    name: row.full_name,
    role: row.is_leader ? "leader" : "minister",
    portfolio: row.ministry_name,
    photo: row.photo_url ?? null,
    color: row.color ?? null,
    isLeader: !!row.is_leader,
  }));
}

