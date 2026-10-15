"use server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { DAY_NAMES, readDay } from "@/lib/hours";
import { createClient } from "@/lib/supabase/server";

export async function saveSalonHours(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const rows = [];
  for (let d = 1; d <= 7; d++) {
    const day = readDay(formData, `d${d}_`);
    if (typeof day === "string") return { error: `${DAY_NAMES[d]} : ${day}.` };
    rows.push({ weekday: d, ...day });
  }
  const supabase = await createClient();
  const { error } = await supabase.from("salon_hours").upsert(rows);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/", "layout");
  return { ok: "Horaires du salon enregistrés." };
}
