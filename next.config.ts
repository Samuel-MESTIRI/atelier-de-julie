import type { NextConfig } from "next";

// Rendu dynamique classique : les pages lisent la base à chaque requête.
// (cacheComponents est volontairement désactivé pour garder le code simple.)
const nextConfig: NextConfig = {
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
