import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Crawlers get fully-resolved responses (no streaming), so missing pages answer with a real 404
  // and renamed handles with a real redirect. Next's default list plus Googlebot.
  htmlLimitedBots:
    /Googlebot|[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|Telegram|Pinterest|Embedly/i,
  partialPrefetching: true,
  async headers() {
    const noFraming = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    ];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Logged-in and account pages can't be put inside someone else's iframe (clickjacking).
      // Public link pages stay embeddable on purpose.
      ...["/dashboard", "/dashboard/:path*", "/admin", "/admin/:path*", "/login", "/signup", "/forgot", "/reset", "/locked/:path*"]
        .map((source) => ({ source, headers: noFraming })),
    ];
  },
  // "Restore my page" uploads a backup file with photos in it (lib/backup.ts caps it at 4 MB)
  experimental: { serverActions: { bodySizeLimit: "4.2mb" } },
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
