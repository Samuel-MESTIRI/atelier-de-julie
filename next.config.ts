import type { NextConfig } from "next";

// En-têtes de sécurité appliqués à toutes les pages
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },                       // pas d'affichage dans une iframe externe
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // le lien secret /rdv/… ne fuit pas
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Rendu dynamique classique : les pages lisent la base à chaque requête.
// (cacheComponents est volontairement désactivé pour garder le code simple.)
const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
