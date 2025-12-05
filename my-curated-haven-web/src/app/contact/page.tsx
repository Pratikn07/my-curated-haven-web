"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import { Mail, MessageSquare, MapPin } from "lucide-react";
import { useState, FormEvent } from "react";

export default function Contact() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        message: ''
    });

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { firstName, lastName, email, message } = formData;
        const subject = encodeURIComponent(`Support Request from ${firstName} ${lastName}`);
        const body = encodeURIComponent(`From: ${firstName} ${lastName}\nEmail: ${email}\n\nMessage:\n${message}`);
        window.location.href = `mailto:support@mycuratedhaven.com?subject=${subject}&body=${body}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-subtle">
            <Navbar />

            <main className="flex-1 pt-20">
                <Section>
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div>
                            <h1 className="text-5xl font-bold text-foreground mb-6 font-heading">Get in touch</h1>
                            <p className="text-xl text-foreground/70 mb-12">
                                Have questions about the app? We'd love to hear from you. Our team is ready to help.
                            </p>

                            <div className="space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-primary">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">Email Us</h3>
                                        <p className="text-foreground/60">support@mycuratedhaven.com</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white rounded-xl shadow-sm text-secondary">
                                        <MessageSquare size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">Live Chat</h3>
                                        <p className="text-foreground/60">Available Mon-Fri, 9am-5pm EST</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Card className="bg-white/80">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground/70">First Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground/70">Last Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground/70">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground/70">Message</label>
                                    <textarea
                                        rows={4}
                                        required
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <button type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                                    Send Message
                                </button>
                            </form>
                        </Card>
                    </div>
                </Section>
            </main>

            <Footer />
        </div>
    );
}
