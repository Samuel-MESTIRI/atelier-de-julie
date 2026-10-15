import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Nunito_Sans } from "next/font/google";
import "./globals.css";

// Polices auto-hébergées par Next.js (aucun appel à Google côté visiteuse)
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});
const nunito = Nunito_Sans({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "L'Atelier de Julie — Coiffure à Saint-Germain-en-Laye",
    template: "%s · L'Atelier de Julie",
  },
  description: "Salon de coiffure à Saint-Germain-en-Laye. Réservez votre rendez-vous en ligne.",
};

export const viewport: Viewport = { themeColor: "#faf6f0" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
