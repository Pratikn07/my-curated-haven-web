"use client";

import { Download, UserPlus, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function HowItWorks() {
    const steps = [
        {
            number: 1,
            icon: Download,
            title: "Download the App",
            description: "Available on iOS. Get started in less than a minute with our simple setup.",
            color: "from-primary to-primary-dark",
            iconBg: "bg-primary/10",
            iconColor: "text-primary"
        },
        {
            number: 2,
            icon: UserPlus,
            title: "Create Your Profile",
            description: "Tell us about your child—their age, interests, and any specific concerns. We'll personalize everything for you.",
            color: "from-secondary to-secondary-dark",
            iconBg: "bg-secondary/10",
            iconColor: "text-secondary"
        },
        {
            number: 3,
            icon: Sparkles,
            title: "Start Thriving",
            description: "Access personalized tips, chat with our AI, track milestones, and enjoy the journey with confidence.",
            color: "from-primary-light to-primary",
            iconBg: "bg-primary-light/10",
            iconColor: "text-primary-light"
        }
    ];

    return (
        <section className="py-24 bg-gradient-subtle relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />

            <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-3xl mx-auto mb-20"
                >
                    <div className="inline-block mb-4">
                        <span className="text-sm uppercase tracking-wider text-primary font-bold bg-primary/10 px-4 py-2 rounded-full">
                            HOW IT WORKS
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-heading">
                        Getting Started is <span className="text-gradient">Simple</span>
                    </h2>
                    <p className="text-xl text-foreground/70 leading-relaxed">
                        Join thousands of parents who've made parenting a little easier. Here's how to begin your journey.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connecting arrows - Desktop Only */}
                    <div className="hidden md:flex absolute top-32 left-0 right-0 items-center justify-center" style={{ width: '80%', left: '10%' }}>
                        <div className="flex-1 flex items-center justify-center">
                            <ArrowRight className="text-primary/30" size={32} />
                        </div>
                        <div className="flex-1" />
                        <div className="flex-1 flex items-center justify-center">
                            <ArrowRight className="text-primary/30" size={32} />
                        </div>
                    </div>

                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                            whileHover={{ y: -8, transition: { duration: 0.2 } }}
                            className="relative"
                        >
                            <div className="relative bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 text-center h-full border border-foreground/5">
                                {/* Step Number Badge */}
                                <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-to-br ${step.color} text-white font-bold text-2xl flex items-center justify-center shadow-lg z-10`}>
                                    {step.number}
                                </div>

                                <div className="mt-6">
                                    {/* Icon with background */}
                                    <div className={`inline-flex w-20 h-20 rounded-2xl ${step.iconBg} items-center justify-center mb-6`}>
                                        <step.icon size={40} className={step.iconColor} />
                                    </div>

                                    <h3 className="text-2xl font-bold text-foreground mb-4 font-heading">
                                        {step.title}
                                    </h3>
                                    <p className="text-foreground/70 leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>

                                {/* Bottom accent line */}
                                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color} rounded-b-3xl`} />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* CTA at the bottom */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="text-center mt-16"
                >
                    <p className="text-foreground/60 mb-6">Ready to get started?</p>
                    <button className="bg-primary text-white text-lg px-10 py-4 rounded-full font-semibold hover:bg-primary/90 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-2 mx-auto">
                        <Download size={20} />
                        Download for iOS
                    </button>
                </motion.div>
            </div>
        </section>
    );
}
