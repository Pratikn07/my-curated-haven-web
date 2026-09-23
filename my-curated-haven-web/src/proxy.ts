import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const deferredPaths = new Set(["/features", "/resources", "/careers", "/contact"]);

function unavailableHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Page not available | My Curated Haven</title>
  <style>
    body { margin: 0; font-family: Georgia, serif; background: #FDFCF8; color: #3D405B; }
    main { max-width: 36rem; margin: 0 auto; padding: 4rem 1.5rem; text-align: center; }
    h1 { font-size: 2.25rem; line-height: 1.2; }
    p { font-size: 1.125rem; line-height: 1.6; }
    .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
    a { min-height: 2.75rem; display: inline-flex; align-items: center; padding: 0.75rem 1.25rem; border-radius: 999px; text-decoration: none; font-weight: 700; }
    .home { background: #3D405B; color: #FDFCF8; }
    .support { border: 1px solid #3D405B; color: #3D405B; }
  </style>
</head>
<body>
  <main>
    <h1>This page is not available</h1>
    <p>That address is not part of the public site. You can go home or email support.</p>
    <div class="actions">
      <a class="home" href="/">Home</a>
      <a class="support" href="/support">Support</a>
    </div>
  </main>
</body>
</html>`;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  const reviewRoute = pathname === "/design-review";
  if (reviewRoute && process.env.VERCEL_ENV === "production") {
    return new NextResponse(unavailableHtml(), {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      },
    });
  }

  if (!deferredPaths.has(pathname)) {
    return NextResponse.next();
  }

  return new NextResponse(unavailableHtml(), {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: [
    "/features",
    "/features/:path*",
    "/resources",
    "/resources/:path*",
    "/careers",
    "/careers/:path*",
    "/contact",
    "/contact/:path*",
    "/design-review",
    "/design-review/:path*",
  ],
};
