export default function CTASection() {
    return (
        <section className="py-24 bg-gradient-primary relative overflow-hidden">
            {/* Decorative Blobs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

            <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center relative z-10">
                <div className="animate-fade-in">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-heading leading-tight">
                        Ready to Start Your Parenting Journey?
                    </h2>
                    <p className="text-xl text-white/90 mb-10 leading-relaxed max-w-2xl mx-auto">
                        Join thousands of parents who are finding their calm with My Curated Haven.
                    </p>

                    <div className="flex justify-center mb-8">
                        <button className="bg-white text-primary text-lg px-12 py-5 rounded-full font-bold hover:bg-white/95 transition-all shadow-2xl hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-3">
                            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            Download for iOS
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6 text-white/90 text-sm">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            No credit card required
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Free to download
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Available on App Store
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
