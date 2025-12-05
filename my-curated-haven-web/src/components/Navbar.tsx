"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full py-4 px-6 sm:px-8 bg-background/95 backdrop-blur-md border-b border-primary/10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Mobile Menu Button (Left) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-foreground hover:text-primary transition-colors -ml-2"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center group">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-logo)', fontWeight: 700 }}>
            <span className="text-foreground">My </span>
            <span className="text-primary">Curated</span>
            <span className="text-foreground"> Haven</span>
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-8 items-center font-medium text-foreground/80">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="/features" className="hover:text-primary transition-colors">Features</Link>
          <Link href="/resources" className="hover:text-primary transition-colors">Resources</Link>
          <Link href="/about" className="hover:text-primary transition-colors">About</Link>
          <Link href="/support" className="hover:text-primary transition-colors">Support</Link>
          <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
        </div>

        {/* Desktop CTA Button */}
        <button className="hidden md:flex bg-primary text-white px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Download App
        </button>

        {/* Spacer for mobile to balance layout */}
        <div className="md:hidden w-10"></div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/98 backdrop-blur-md border-b border-primary/10 shadow-lg">
          <div className="flex flex-col py-4 px-6 space-y-4">
            <Link
              href="/"
              className="text-foreground/80 hover:text-primary transition-colors font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/features"
              className="text-foreground/80 hover:text-primary transition-colors font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/resources"
              className="text-foreground/80 hover:text-primary transition-colors font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Resources
            </Link>
            <Link
              href="/about"
              className="text-foreground/80 hover:text-primary transition-colors font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/support"
              className="text-foreground/80 hover:text-primary transition-colors font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Support
            </Link>
            <Link
              href="/contact"
              className="text-foreground/80 hover:text-primary transition-colors font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
