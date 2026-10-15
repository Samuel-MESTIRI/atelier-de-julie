"use server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { int, text } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const minNotice = int(formData, "min_notice_hours", 0, 168);
  const maxAdvance = int(formData, "max_advance_days", 1, 365);
  const cancelLimit = int(formData, "cancel_limit_hours", 0, 168);
  const step = int(formData, "slot_step_min", 5, 60);
  if (minNotice === null) return { error: "Délai minimum : entre 0 et 168 heures." };
  if (maxAdvance === null) return { error: "Délai maximum : entre 1 et 365 jours." };
  if (cancelLimit === null) return { error: "Délai d'annulation : entre 0 et 168 heures." };
  if (step === null || ![5, 10, 15, 20, 30, 60].includes(step)) return { error: "Intervalle des créneaux invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("settings").update({
    min_notice_hours: minNotice,
    max_advance_days: maxAdvance,
    cancel_limit_hours: cancelLimit,
    slot_step_min: step,
    salon_name: text(formData, "salon_name", 80) || "L'Atelier de Julie",
    address: text(formData, "address", 200),
    phone: text(formData, "phone", 30),
    email: text(formData, "email", 120),
    legal_name: text(formData, "legal_name", 120),
    siret: text(formData, "siret", 30),
    host_info: text(formData, "host_info", 300),
  }).eq("id", 1);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/", "layout");
  return { ok: "Réglages enregistrés." };
}
