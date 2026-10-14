import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowLocalIP:
      process.env.VERCEL_ENV !== "production" &&
      /^http:\/\/(?:localhost|127\.0\.0\.1):543(?:21|41)\/?$/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ccrgvammglkvdlaojgzv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54341",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Short links for Instagram (docs/INSTAGRAM-LINKS.md). Temporary, so the target can change after a season
  // without editing the bio; these tags win over any the visitor's link already carries.
  async redirects() {
    return [
      {
        source: "/ig",
        destination: "/halloween?utm_source=instagram&utm_medium=organic_social&utm_campaign=bio_link",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
