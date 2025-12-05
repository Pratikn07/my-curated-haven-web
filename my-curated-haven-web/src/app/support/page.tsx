"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import { Mail, MessageSquare, Book, HelpCircle, Search, ChevronDown } from "lucide-react";
import { useState } from "react";

interface FAQ {
    question: string;
    answer: string;
    category: string;
}

const faqs: FAQ[] = [
    {
        category: "Getting Started",
        question: "How do I create an account?",
        answer: "Download the My Curated Haven app from the App Store, tap 'Sign Up', and follow the prompts to create your account using your email address. You'll need to verify your email before you can start using all features."
    },
    {
        category: "Getting Started",
        question: "How do I add my child's information?",
        answer: "After signing in, navigate to Settings > Manage Children > Add Child. Enter your child's name, birth date, and any other relevant information to personalize your experience."
    },
    {
        category: "Features",
        question: "What is the AI Chat feature?",
        answer: "Our AI Chat provides 24/7 personalized parenting support. Ask questions about child development, behavior, sleep, feeding, and more. The AI learns from your interactions to provide increasingly personalized advice."
    },
    {
        category: "Features",
        question: "How do Milestone Trackers work?",
        answer: "Milestone Trackers help you monitor your child's developmental progress. You can log achievements, receive age-appropriate milestone checklists, and get notifications when new milestones are approaching."
    },
    {
        category: "Features",
        question: "What resources are available?",
        answer: "Access expert articles, videos, and guides on topics like sleep training, nutrition, behavior management, and child development. All content is curated by child development experts and updated regularly."
    },
    {
        category: "Account & Privacy",
        question: "Is my data secure?",
        answer: "Yes! We use industry-standard encryption to protect your data. We never share your personal information with third parties without your explicit consent. Read our Privacy Policy for complete details."
    },
    {
        category: "Account & Privacy",
        question: "How do I delete my account?",
        answer: "Go to Settings > Account > Delete Account. Please note this action is permanent and will remove all your data from our servers."
    },
    {
        category: "Troubleshooting",
        question: "The app won't load. What should I do?",
        answer: "Try these steps: 1) Close and restart the app, 2) Check your internet connection, 3) Update to the latest version from the App Store, 4) Restart your device. If issues persist, contact support@mycuratedhaven.com."
    },
    {
        category: "Troubleshooting",
        question: "I'm not receiving notifications",
        answer: "Go to your device Settings > Notifications > My Curated Haven and ensure notifications are enabled. Also check that Do Not Disturb mode is not active."
    },
    {
        category: "Billing & Subscriptions",
        question: "How much does the app cost?",
        answer: "My Curated Haven is free to download with basic features available at no cost. Premium features are available through a subscription plan. Check the app for current pricing and subscription options."
    },
    {
        category: "Billing & Subscriptions",
        question: "How do I cancel my subscription?",
        answer: "Open the App Store, tap your profile picture, then Subscriptions. Find My Curated Haven and tap Cancel Subscription. Your access will continue until the end of your billing period."
    }
];

const categories = Array.from(new Set(faqs.map(faq => faq.category)));

export default function Support() {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");

    const filteredFAQs = faqs.filter(faq => {
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen flex flex-col bg-gradient-subtle">
            <Navbar />

            <main className="flex-1 pt-20">
                {/* Hero Section */}
                <div className="py-24 px-6 md:px-12 animate-fade-in">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 font-heading">
                            How can we help you?
                        </h1>
                        <p className="text-xl text-foreground/70 mb-8">
                            Find answers to common questions or get in touch with our support team
                        </p>

                        {/* Search Bar */}
                        <div className="relative max-w-2xl mx-auto mb-12">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={20} />
                            <input
                                type="text"
                                placeholder="Search for help..."
                                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Contact Options */}
                <div className="py-24 px-6 md:px-12 bg-white/50 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-12 font-heading">Quick Ways to Get Support</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="text-center hover:shadow-xl transition-all cursor-pointer bg-white">
                                <div className="inline-block p-4 bg-primary/10 rounded-2xl mb-4">
                                    <Mail className="text-primary" size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Email Support</h3>
                                <p className="text-foreground/60 mb-4">
                                    Get help via email
                                </p>
                                <a href="mailto:support@mycuratedhaven.com" className="text-primary font-semibold hover:underline">
                                    support@mycuratedhaven.com
                                </a>
                            </Card>

                            <Card className="text-center hover:shadow-xl transition-all cursor-pointer bg-white">
                                <div className="inline-block p-4 bg-secondary/10 rounded-2xl mb-4">
                                    <MessageSquare className="text-secondary" size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Contact Form</h3>
                                <p className="text-foreground/60 mb-4">
                                    Send us a detailed message
                                </p>
                                <a href="/contact" className="text-secondary font-semibold hover:underline">
                                    Go to Contact Page
                                </a>
                            </Card>

                            <Card className="text-center hover:shadow-xl transition-all cursor-pointer bg-white">
                                <div className="inline-block p-4 bg-primary-dark/10 rounded-2xl mb-4">
                                    <Book className="text-primary-dark" size={32} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Documentation</h3>
                                <p className="text-foreground/60 mb-4">
                                    Browse our help articles
                                </p>
                                <span className="text-primary-dark font-semibold">
                                    See FAQs below
                                </span>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="py-24 px-6 md:px-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-4xl font-bold text-center mb-4 font-heading">Frequently Asked Questions</h2>
                        <p className="text-center text-foreground/60 mb-12">
                            Find quick answers to the most common questions
                        </p>

                        {/* Category Filter */}
                        <div className="flex flex-wrap gap-3 justify-center mb-8">
                            <button
                                onClick={() => setSelectedCategory("All")}
                                className={`px-6 py-2 rounded-full font-medium transition-all ${selectedCategory === "All"
                                    ? "bg-primary text-white shadow-lg"
                                    : "bg-white text-foreground/70 hover:bg-primary/10"
                                    }`}
                            >
                                All
                            </button>
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-6 py-2 rounded-full font-medium transition-all ${selectedCategory === category
                                        ? "bg-primary text-white shadow-lg"
                                        : "bg-white text-foreground/70 hover:bg-primary/10"
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        {/* FAQ List */}
                        <div className="space-y-4">
                            {filteredFAQs.length === 0 ? (
                                <Card className="text-center py-12 bg-white">
                                    <HelpCircle className="mx-auto text-foreground/20 mb-4" size={48} />
                                    <p className="text-foreground/60 text-lg">
                                        No FAQs found matching your search. Try a different query or contact support.
                                    </p>
                                </Card>
                            ) : (
                                filteredFAQs.map((faq, index) => (
                                    <div
                                        key={index}
                                        className="cursor-pointer"
                                        onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                                    >
                                        <Card className="bg-white hover:shadow-lg transition-all">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                                                            {faq.category}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-foreground mb-2">
                                                        {faq.question}
                                                    </h3>
                                                    {expandedFAQ === index && (
                                                        <p className="text-foreground/70 mt-4 leading-relaxed">
                                                            {faq.answer}
                                                        </p>
                                                    )}
                                                </div>
                                                <ChevronDown
                                                    className={`text-foreground/40 flex-shrink-0 transition-transform ${expandedFAQ === index ? "rotate-180" : ""
                                                        }`}
                                                    size={24}
                                                />
                                            </div>
                                        </Card>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Still Need Help Section */}
                <div className="py-24 px-6 md:px-12 bg-gradient-to-br from-primary/5 to-secondary/5 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-4xl font-bold mb-6 font-heading">Still need help?</h2>
                        <p className="text-xl text-foreground/70 mb-8">
                            Can't find what you're looking for? Our support team is here to assist you.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a
                                href="mailto:support@mycuratedhaven.com"
                                className="px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                            >
                                Email Support
                            </a>
                            <a
                                href="/contact"
                                className="px-8 py-4 bg-white text-primary font-bold rounded-xl hover:shadow-lg transition-all border-2 border-primary"
                            >
                                Contact Us
                            </a>
                        </div>
                        <p className="mt-8 text-sm text-foreground/60">
                            Average response time: 24-48 hours
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
