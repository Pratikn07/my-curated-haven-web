import Link from "next/link";
import { footerLinks } from "@/config/site-navigation";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2">
        <div>
          <Link href="/" className="font-brand text-2xl font-semibold">
            Nibble &amp; Nurture
          </Link>
          <p className="mt-2 max-w-sm text-text-muted">
            The company behind My Curated Haven, with recipes by Tiny Soho.
          </p>
        </div>
        <ul className="grid gap-2">
          {footerLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="inline-flex min-h-11 items-center font-semibold">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="px-4 pb-8 text-center text-sm text-text-muted">
        © {year} Nibble &amp; Nurture. All rights reserved.
      </p>
    </footer>
  );
}
