// Lectures des données publiques du salon (soumises aux règles RLS "public_read").
import { createClient } from "@/lib/supabase/server";

export type Service = {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price_cents: number;
};

export type SalonHours = {
  weekday: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
};

export type Settings = {
  min_notice_hours: number;
  max_advance_days: number;
  cancel_limit_hours: number;
  slot_step_min: number;
  salon_name: string;
  address: string;
  phone: string;
  email: string;
  legal_name: string;
  siret: string;
  host_info: string;
};

export const WEEKDAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** "09:00:00" → "9 h", "12:30:00" → "12 h 30" */
export function formatHour(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  return m === "00" ? `${Number(h)} h` : `${Number(h)} h ${m}`;
}

export async function getServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("id, name, description, duration_min, price_cents")
    .eq("active", true)
    .order("position");
  return data ?? [];
}

export async function getSalonHours(): Promise<SalonHours[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("salon_hours").select("*").order("weekday");
  return data ?? [];
}

export async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error("Réglages du salon introuvables.");
  return data;
}
