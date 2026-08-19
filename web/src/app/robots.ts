import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prompt-pro-liart.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/demo",
          "/upgrade",
          "/terms",
          "/privacy",
          "/login",
          "/sign-up",
        ],
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/admin",
          "/admin/",
          "/history",
          "/history/",
          "/library",
          "/library/",
          "/optimization",
          "/optimization/",
          "/settings",
          "/settings/",
          "/prompt-data",
          "/prompt-data/",
          "/extension-linked",
          "/signout",
          "/unauthorized",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
