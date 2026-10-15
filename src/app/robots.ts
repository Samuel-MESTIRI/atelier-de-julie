import type { MetadataRoute } from "next";

// Les moteurs de recherche n'indexent que le site public.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/connexion", "/rdv/"] },
  };
}
