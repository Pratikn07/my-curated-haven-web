import Image from 'next/image';

// App Store link added - triggering fresh deployment
export default function Hero() {
  return (
    <section className="w-full pt-12 pb-24 px-6 sm:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Left Column - Content */}
        <div className="flex-1 flex flex-col gap-6 text-center md:text-left animate-fade-in">

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight font-heading">
            Your Personal <br />
            <span className="text-primary">Parenting Haven</span>
          </h1>

          <p className="text-xl text-foreground/70 max-w-lg mx-auto md:mx-0 leading-relaxed">
            Expert guidance, milestone tracking, and 24/7 AI support—all curated for your child's unique journey.
            Because every parent deserves peace of mind.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center md:justify-start">
            <a href="https://apps.apple.com/us/app/my-curated-haven/id6755850584" target="_blank" rel="noopener noreferrer">
              <button className="bg-primary text-white text-lg px-10 py-4 rounded-full font-semibold hover:bg-primary/90 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Download for iOS
              </button>
            </a>
          </div>
        </div>

        {/* Right Column - Hero Image with Floating Cards */}
        <div className="flex-1 relative w-full max-w-md md:max-w-full animate-scale-in">
          {/* Main Image Container */}
          <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl">
            <Image
              src="/images/Homepage-image.png"
              alt="Parent and child together"
              fill
              className="object-cover"
              priority
            />

            {/* Floating Feature Cards */}
            <div className="absolute bottom-20 -left-4 bg-white rounded-2xl shadow-xl p-4 animate-float max-w-[200px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-xl">👶</div>
                <div>
                  <div className="text-xs text-foreground/60">First Steps!</div>
                  <div className="font-semibold text-sm">Milestone tracked</div>
                </div>
              </div>
            </div>

            <div className="absolute top-20 -right-4 bg-white rounded-2xl shadow-xl p-4 animate-float max-w-[200px]" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">🤖</div>
                <div>
                  <div className="text-xs text-foreground/60">AI Assistant</div>
                  <div className="font-semibold text-sm">24/7 parenting support</div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Blobs */}
          <div className="absolute -z-10 top-1/2 -right-12 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
          <div className="absolute -z-10 -bottom-12 -left-12 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        </div>
      </div>
    </section>
  );
}
