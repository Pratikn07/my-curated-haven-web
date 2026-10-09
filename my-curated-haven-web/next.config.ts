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
};

export default nextConfig;
