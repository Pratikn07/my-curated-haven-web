"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Heart, Shield, Sparkles } from "lucide-react";

export default function About() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

            <main className="flex-1 pt-20">
                <Section className="text-center py-32">
                    <Badge variant="accent" className="mb-6">Our Mission</Badge>
                    <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-8 font-heading">
                        Empowering parents to <br />
                        <span className="text-gradient">thrive, not just survive.</span>
                    </h1>
                    <p className="text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed">
                        We believe that parenting should be filled with joy, not anxiety. Our mission is to provide every parent with the personalized support, expert knowledge, and tools they need to raise happy, healthy children.
                    </p>
                </Section>

                <Section className="bg-white">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
                                <Heart size={32} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 font-heading">Empathy First</h3>
                            <p className="text-foreground/70">We understand the challenges of parenting because we've been there. Everything we build is designed with compassion.</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-secondary">
                                <Shield size={32} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 font-heading">Trust & Safety</h3>
                            <p className="text-foreground/70">Your family's privacy and safety are our top priorities. We adhere to the strictest data protection standards.</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary-dark">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 font-heading">Innovation</h3>
                            <p className="text-foreground/70">We leverage the latest technology to provide you with the most accurate, timely, and helpful support possible.</p>
                        </div>
                    </div>
                </Section>
            </main>

            <Footer />
        </div>
    );
}
