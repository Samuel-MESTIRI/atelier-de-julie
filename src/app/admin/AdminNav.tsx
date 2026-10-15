"use client";
// Menu du back-office (lien actif mis en évidence)
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Planning", adminOnly: false },
  { href: "/admin/rdv/nouveau", label: "+ Rendez-vous", adminOnly: true },
  { href: "/admin/clientes", label: "Clientes", adminOnly: true },
  { href: "/admin/prestations", label: "Prestations", adminOnly: true },
  { href: "/admin/equipe", label: "Équipe", adminOnly: true },
  { href: "/admin/horaires", label: "Horaires", adminOnly: true },
  { href: "/admin/conges", label: "Congés", adminOnly: true },
  { href: "/admin/reglages", label: "Réglages", adminOnly: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/rdv/") && !pathname.endsWith("nouveau")
                      : pathname.startsWith(href);

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
      {NAV.filter((l) => isAdmin || !l.adminOnly).map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 ${
            isActive(l.href) ? "bg-sage-dark text-white" : "hover:bg-sand"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
