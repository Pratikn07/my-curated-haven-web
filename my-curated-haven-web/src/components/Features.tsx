"use client";

import { MessageCircle, BookOpen, Users, Stethoscope, ShoppingBag, Camera } from "lucide-react";
import { motion } from "framer-motion";

export default function Features() {
    const features = [
        {
            icon: MessageCircle,
            title: "AI Parenting Assistant",
            description: "Get 24/7 personalized advice from our AI-powered chat. Ask anything—from feeding schedules to sleep training.",
            bgColor: "bg-primary/10",
            iconColor: "text-primary"
        },
        {
            icon: BookOpen,
            title: "Curated Resources",
            description: "Access a library of expert-vetted articles and guides covering every parenting topic imaginable.",
            bgColor: "bg-secondary/10",
            iconColor: "text-secondary"
        },
        {
            icon: Users,
            title: "Community Forum",
            description: "Connect with a supportive community of parents who understand exactly what you're going through.",
            bgColor: "bg-primary-dark/10",
            iconColor: "text-primary-dark"
        },
        {
            icon: Stethoscope,
            title: "Expert Marketplace",
            description: "Book virtual consultations with certified pediatricians, sleep consultants, and child psychologists.",
            bgColor: "bg-primary/10",
            iconColor: "text-primary"
        },
        {
            icon: ShoppingBag,
            title: "Curated Shop",
            description: "Browse our selection of high-quality, safety-tested baby gear, toys, and essentials recommended by experts.",
            bgColor: "bg-secondary/10",
            iconColor: "text-secondary"
        },
        {
            icon: Camera,
            title: "Digital Memory Lane",
            description: "Create a beautiful, secure digital scrapbook of your child's life. Moments automatically organized by age.",
            bgColor: "bg-primary-dark/10",
            iconColor: "text-primary-dark"
        }
    ];

    return (
        <section id="features" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6 sm:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <div className="inline-block mb-4">
                        <span className="text-sm uppercase tracking-wider text-primary font-bold bg-primary/10 px-4 py-2 rounded-full">
                            FEATURES
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-heading">
                        Everything You Need, <span className="text-gradient">Thoughtfully Curated</span>
                    </h2>
                    <p className="text-xl text-foreground/70 leading-relaxed">
                        From AI-powered guidance to milestone tracking, we've built every feature with one goal:
                        giving you more confidence and peace of mind.
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -8, transition: { duration: 0.2 } }}
                            className="group p-8 rounded-3xl bg-background border border-primary/10 hover:border-primary/30 hover:shadow-xl transition-all duration-300"
                        >
                            <div className={`w-16 h-16 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                <feature.icon size={32} className={feature.iconColor} />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3 font-heading">
                                {feature.title}
                            </h3>
                            <p className="text-foreground/70 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
