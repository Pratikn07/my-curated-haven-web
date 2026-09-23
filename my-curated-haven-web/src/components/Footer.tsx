import Link from "next/link";
import { footerLinks } from "@/config/site-navigation";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#3D405B] text-white py-16 px-6 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-12 mb-12">
          <div>
            <Link href="/" className="inline-block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-logo)", fontWeight: 700 }}>
                <span className="text-white">My </span>
                <span className="text-primary">Curated</span>
                <span className="text-white"> Haven</span>
              </span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed mt-4 max-w-sm">
              Recipes by Tiny Soho, inside My Curated Haven.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-4 font-heading">Explore</h2>
            <ul className="space-y-3 text-white/70 text-sm">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-center text-white/60 text-sm">
          © {year} My Curated Haven. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
