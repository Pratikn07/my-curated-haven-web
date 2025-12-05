export default function Testimonials() {
    const testimonials = [
        {
            quote: "This app has been a lifesaver! The AI assistant answers my questions instantly, and the milestone tracker helps me celebrate every little victory with my daughter.",
            name: "Sarah M.",
            role: "Mother of 1",
            rating: 5
        },
        {
            quote: "I love how personalized everything is. The daily tips are always relevant to my son's age, and switching between profiles for my two kids is seamless.",
            name: "Michael T.",
            role: "Father of 2",
            rating: 5
        },
        {
            quote: "The curated resources section is incredible. No more endless googling—everything I need is right here, vetted by experts.",
            name: "Jennifer L.",
            role: "Mother of 3",
            rating: 5
        }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6 sm:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
                    <p className="text-sm uppercase tracking-wider text-accent font-semibold mb-3">TESTIMONIALS</p>
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 font-heading">
                        Loved by <span className="text-primary">Parents</span>
                    </h2>
                    <p className="text-lg text-foreground/70 leading-relaxed">
                        Don't just take our word for it. Here's what parents in our community have to say.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="bg-background p-8 rounded-3xl border border-primary/10 hover:border-primary/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Star Rating */}
                            <div className="flex gap-1 mb-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <svg key={i} className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>

                            {/* Quote */}
                            <p className="text-foreground/80 leading-relaxed mb-6 italic">
                                "{testimonial.quote}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                                    {testimonial.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                                    <div className="text-sm text-foreground/60">{testimonial.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
