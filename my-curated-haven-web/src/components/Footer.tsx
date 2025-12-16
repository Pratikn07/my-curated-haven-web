import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="bg-[#3D405B] text-white py-16 px-6 sm:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* Brand Column */}
                    <div className="md:col-span-1">
                        <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-logo)', fontWeight: 700 }}>
                            <span className="text-white">My </span>
                            <span className="text-primary">Curated</span>
                            <span className="text-white"> Haven</span>
                        </h2>
                        <p className="text-white/70 text-sm leading-relaxed">
                            Empowering parents with curated knowledge and tools for every stage of your child's journey.
                        </p>
                    </div>

                    {/* Product Column */}
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-heading">Product</h3>
                        <ul className="space-y-3 text-white/70 text-sm">
                            <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="/resources" className="hover:text-white transition-colors">Resources</Link></li>
                            <li><Link href="https://apps.apple.com/us/app/my-curated-haven/id6755850584" className="hover:text-white transition-colors">Download App</Link></li>
                        </ul>
                    </div>

                    {/* Company Column */}
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-heading">Company</h3>
                        <ul className="space-y-3 text-white/70 text-sm">
                            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Legal Column */}
                    <div>
                        <h3 className="font-bold text-lg mb-4 font-heading">Legal</h3>
                        <ul className="space-y-3 text-white/70 text-sm">
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/10 text-center text-white/60 text-sm">
                    © 2025 My Curated Haven. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
