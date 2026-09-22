"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { headerLinks } from "@/config/site-navigation";

const linkClass =
  "text-foreground/80 hover:text-primary transition-colors font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground rounded-sm";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    menuRef.current?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 w-full py-4 px-6 sm:px-8 bg-background/95 backdrop-blur-md border-b border-primary/10">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center text-foreground hover:text-primary transition-colors -ml-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground rounded-md"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls={menuId}
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        <Link href="/" className="flex items-center min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground rounded-sm" onClick={closeMenu}>
          <span className="text-lg sm:text-3xl font-bold whitespace-nowrap" style={{ fontFamily: "var(--font-logo)", fontWeight: 700 }}>
            <span className="text-foreground">My </span>
            <span className="text-primary">Curated</span>
            <span className="text-foreground"> Haven</span>
          </span>
        </Link>

        <div className="hidden md:flex gap-8 items-center font-medium">
          {headerLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="md:hidden w-11" aria-hidden="true" />
      </div>

      {mobileMenuOpen && (
        <div
          ref={menuRef}
          id={menuId}
          tabIndex={-1}
          className="md:hidden absolute top-full left-0 right-0 bg-background/98 backdrop-blur-md border-b border-primary/10 shadow-lg outline-none"
        >
          <div className="flex flex-col py-2 px-6">
            {headerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${linkClass} min-h-11 flex items-center`}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
