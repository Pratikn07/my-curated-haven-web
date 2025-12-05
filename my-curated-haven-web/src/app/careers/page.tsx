"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Heart, Users, Rocket, Coffee } from "lucide-react";

export default function Careers() {
    const values = [
        {
            icon: Heart,
            title: "Empathy First",
            description: "We build products with deep understanding of parents' challenges and needs."
        },
        {
            icon: Users,
            title: "Collaborative",
            description: "Great ideas come from working together and supporting each other."
        },
        {
            icon: Rocket,
            title: "Innovation",
            description: "We're constantly pushing boundaries to create better parenting solutions."
        },
        {
            icon: Coffee,
            title: "Work-Life Balance",
            description: "We practice what we preach—family comes first, always."
        }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

            <main className="flex-1 pt-20">
                {/* Hero Section */}
                <section className="py-24 bg-gradient-subtle animate-fade-in">
                    <div className="max-w-4xl mx-auto px-6 text-center">
                        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 font-heading">
                            Join Our <span className="text-primary">Mission</span>
                        </h1>
                        <p className="text-xl text-foreground/70 leading-relaxed mb-8">
                            Help us build the future of parenting support. We're looking for passionate individuals
                            who want to make a real difference in families' lives.
                        </p>
                        <div className="inline-block bg-secondary/10 px-6 py-3 rounded-full">
                            <p className="text-secondary font-semibold">
                                Currently building our founding team
                            </p>
                        </div>
                    </div>
                </section>

                {/* Values Section */}
                <div className="py-24 px-6 md:px-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-4xl font-bold text-center mb-4 font-heading">Our Values</h2>
                        <p className="text-center text-foreground/60 mb-12 text-lg">
                            These principles guide everything we do
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {values.map((value, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="text-center"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <value.icon size={32} className="text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-2 font-heading">{value.title}</h3>
                                    <p className="text-foreground/70">{value.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Open Positions Section */}
                <div className="py-24 px-6 md:px-12 bg-white animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-4xl font-bold mb-6 font-heading">Open Positions</h2>
                        <p className="text-xl text-foreground/70 mb-12">
                            We're in the early stages of building something special. While we don't have open positions
                            at the moment, we're always interested in connecting with talented people who share our vision.
                        </p>

                        <div className="bg-gradient-subtle p-12 rounded-3xl">
                            <h3 className="text-2xl font-bold mb-4 font-heading">Interested in joining us?</h3>
                            <p className="text-foreground/70 mb-8">
                                Send us your resume and a note about why you're passionate about helping parents.
                                We'll keep you in mind for future opportunities.
                            </p>
                            <a
                                href="mailto:careers@mycuratedhaven.com"
                                className="inline-block bg-primary text-white px-8 py-4 rounded-full font-bold hover:bg-primary-dark transition-colors shadow-lg"
                            >
                                Get in Touch
                            </a>
                        </div>
                    </div>
                </div>

                {/* Perks Section */}
                <div className="py-24 px-6 md:px-12 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-4xl font-bold text-center mb-12 font-heading">Why Join Us?</h2>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="bg-white p-8 rounded-3xl shadow-lg">
                                <h3 className="text-2xl font-bold mb-4 text-primary font-heading">Make Real Impact</h3>
                                <p className="text-foreground/70">
                                    Your work will directly help thousands of families navigate the beautiful chaos of parenthood.
                                </p>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-lg">
                                <h3 className="text-2xl font-bold mb-4 text-secondary font-heading">Grow With Us</h3>
                                <p className="text-foreground/70">
                                    Be part of a founding team and help shape the company's culture and direction from day one.
                                </p>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-lg">
                                <h3 className="text-2xl font-bold mb-4 text-primary-dark font-heading">Family Friendly</h3>
                                <p className="text-foreground/70">
                                    Flexible hours, remote work options, and genuine understanding when family needs come first.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
