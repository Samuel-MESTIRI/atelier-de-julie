import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getServices } from "@/lib/public-data";
import { BookingFlow, type StylistOption } from "./BookingFlow";

export const metadata: Metadata = { title: "Réserver" };

export default async function BookingPage() {
  const supabase = await createClient();
  const [services, { data: stylists }, { data: links }] = await Promise.all([
    getServices(),
    supabase.from("stylists").select("id, name, color").eq("active", true).order("position"),
    supabase.from("stylist_services").select("stylist_id, service_id"),
  ]);

  // Pour chaque coiffeuse : la liste des prestations qu'elle réalise
  const stylistOptions: StylistOption[] = (stylists ?? []).map((s) => ({
    ...s,
    serviceIds: (links ?? []).filter((l) => l.stylist_id === s.id).map((l) => l.service_id),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-4xl">Prendre rendez-vous</h1>
      <p className="mt-1 text-muted">Sans création de compte, en moins d&apos;une minute.</p>
      <BookingFlow services={services} stylists={stylistOptions} />
    </div>
  );
}
