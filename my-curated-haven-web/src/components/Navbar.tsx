"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { headerLinks } from "@/config/site-navigation";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-border bg-canvas">
      <nav aria-label="Primary" className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="min-w-0 font-brand text-[1.5rem] leading-none font-semibold text-foreground sm:text-[1.75rem]">
          <span>My </span>
          <span className="text-action">Curated</span>
          <span> Haven</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {headerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="font-semibold text-foreground">
              {link.label}
            </Link>
          ))}
        </div>

        <button
          ref={buttonRef}
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-control md:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls={menuId}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {mobileMenuOpen ? (
        <div id={menuId} className="border-t border-border bg-canvas px-4 py-2 md:hidden">
          {headerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-12 items-center font-semibold"
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
