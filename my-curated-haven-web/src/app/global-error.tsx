"use client";

/**
 * The last resort when even the site's layout fails: a plain page in the site's colours with a way back, instead of
 * the framework's "Application error" screen. It replaces the whole document, so it carries its own html and styles.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Georgia, serif", background: "#FDFCF8", color: "#3D405B" }}>
        <main style={{ maxWidth: "36rem", margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", lineHeight: 1.2 }}>My Curated Haven didn&apos;t load</h1>
          <p style={{ fontSize: "1.125rem", lineHeight: 1.6 }}>
            Something went wrong on our side. Please try again in a moment.
          </p>
          <p style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ minHeight: "2.75rem", padding: "0.75rem 1.25rem", borderRadius: 999, border: 0, background: "#3D405B", color: "#FDFCF8", fontWeight: 700, font: "inherit" }}
            >
              Try again
            </button>
            {/* A plain link: the app's router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ minHeight: "2.75rem", display: "inline-flex", alignItems: "center", padding: "0 1.25rem", borderRadius: 999, border: "1px solid #3D405B", color: "#3D405B", fontWeight: 700, textDecoration: "none" }}>
              Home
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
