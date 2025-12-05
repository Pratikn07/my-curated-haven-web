"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { motion } from "framer-motion";
import {
    BookOpen,
    Video,
    FileText,
    Headphones,
    Search,
    Filter,
    Clock,
    TrendingUp,
    Heart,
    Moon,
    Utensils,
    Brain
} from "lucide-react";

export default function Resources() {
    const categories = [
        {
            name: "Sleep & Rest",
            icon: Moon,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            count: 127
        },
        {
            name: "Feeding & Nutrition",
            icon: Utensils,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
            count: 153
        },
        {
            name: "Development",
            icon: TrendingUp,
            color: "text-green-600",
            bgColor: "bg-green-50",
            count: 189
        },
        {
            name: "Health & Wellness",
            icon: Heart,
            color: "text-red-600",
            bgColor: "bg-red-50",
            count: 142
        },
        {
            name: "Behavior",
            icon: Brain,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            count: 98
        }
    ];

    const featuredResources = [
        {
            title: "The Ultimate Guide to Sleep Training",
            category: "Sleep & Rest",
            type: "Article",
            readTime: "12 min read",
            icon: FileText,
            excerpt: "Evidence-based methods to help your baby sleep through the night, with expert tips and real parent experiences.",
            image: "sleep-guide"
        },
        {
            title: "Introducing Solids: A Step-by-Step Approach",
            category: "Feeding & Nutrition",
            type: "Video Series",
            readTime: "45 min",
            icon: Video,
            excerpt: "Watch how to safely introduce solid foods, recognize allergies, and create healthy eating habits from day one.",
            image: "feeding-guide"
        },
        {
            title: "Milestone Tracking: What's Normal?",
            category: "Development",
            type: "Guide",
            readTime: "8 min read",
            icon: BookOpen,
            excerpt: "Understand developmental milestones by age and learn when to celebrate progress vs. when to consult a doctor.",
            image: "milestone-guide"
        },
        {
            title: "Managing Tantrums with Compassion",
            category: "Behavior",
            type: "Podcast",
            readTime: "32 min",
            icon: Headphones,
            excerpt: "Learn positive discipline techniques that work, from a child psychologist with 20+ years of experience.",
            image: "behavior-guide"
        }
    ];

    const contentTypes = [
        { name: "Articles", icon: FileText, count: 342 },
        { name: "Videos", icon: Video, count: 128 },
        { name: "Guides", icon: BookOpen, count: 86 },
        { name: "Podcasts", icon: Headphones, count: 54 }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

            <main className="flex-1 pt-20">
                {/* Hero Section */}
                <section className="relative py-24 bg-gradient-subtle">
                    <div className="max-w-7xl mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="text-center"
                        >
                            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 font-heading tracking-tight">
                                Expert-Vetted <br />
                                <span className="text-secondary">Parenting Resources</span>
                            </h1>
                            <p className="text-xl text-foreground/70 max-w-2xl mx-auto mb-12 leading-relaxed">
                                Access thousands of articles, videos, and guides curated by pediatricians and parenting experts.
                            </p>

                            {/* Search Bar */}
                            <div className="max-w-2xl mx-auto">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground/40" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search for topics like 'sleep training', 'picky eating', 'potty training'..."
                                        className="w-full pl-12 pr-4 py-4 rounded-full border border-foreground/10 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Categories */}
                <div className="py-24 px-6 md:px-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-bold text-foreground mb-4 font-heading">Browse by Topic</h2>
                            <p className="text-xl text-foreground/60">
                                Find resources tailored to your family's current challenges.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {categories.map((category, index) => (
                                <motion.div
                                    key={category.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                >
                                    <Card className="text-center hover:border-primary/30 transition-all cursor-pointer group">
                                        <div className={`w-16 h-16 rounded-2xl ${category.bgColor} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                                            <category.icon size={32} className={category.color} />
                                        </div>
                                        <h3 className="font-bold text-foreground mb-2">{category.name}</h3>
                                        <p className="text-sm text-foreground/60">{category.count} resources</p>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Featured Resources */}
                <div className="py-24 px-6 md:px-12 bg-white animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-center mb-16">
                            <div>
                                <h2 className="text-4xl font-bold text-foreground mb-4 font-heading">Featured Resources</h2>
                                <p className="text-xl text-foreground/60">
                                    Hand-picked by our editorial team this week.
                                </p>
                            </div>
                            <button className="hidden md:flex items-center gap-2 px-6 py-3 border border-foreground/20 rounded-full hover:border-primary hover:text-primary transition-colors">
                                <Filter size={20} />
                                Filter
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {featuredResources.map((resource, index) => (
                                <Card key={index} className="hover:border-primary/20 transition-all cursor-pointer group overflow-hidden">
                                    {/* Placeholder Image */}
                                    <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-secondary/10 mb-6 rounded-lg flex items-center justify-center relative overflow-hidden">
                                        <resource.icon size={64} className="text-foreground/10" />
                                        <Badge variant="accent" className="absolute top-4 left-4">
                                            {resource.type}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-4 mb-4 text-sm">
                                        <span className="text-primary font-medium">{resource.category}</span>
                                        <span className="flex items-center gap-1 text-foreground/60">
                                            <Clock size={14} />
                                            {resource.readTime}
                                        </span>
                                    </div>

                                    <h3 className="text-2xl font-bold text-foreground mb-3 font-heading group-hover:text-primary transition-colors">
                                        {resource.title}
                                    </h3>
                                    <p className="text-foreground/70 leading-relaxed">
                                        {resource.excerpt}
                                    </p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Types */}
                <div className="py-24 px-6 md:px-12 bg-gradient-subtle animate-fade-in" style={{ animationDelay: '0.6s' }}>
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-bold text-foreground mb-4 font-heading">Choose Your Format</h2>
                            <p className="text-xl text-foreground/60">
                                Learn your way—whether you prefer reading, watching, or listening.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {contentTypes.map((type, index) => (
                                <motion.div
                                    key={type.name}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                >
                                    <Card className="text-center hover:border-primary/30 transition-all cursor-pointer group">
                                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                                            <type.icon size={40} className="text-primary" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-foreground mb-2 font-heading">{type.count}</h3>
                                        <p className="text-foreground/60">{type.name}</p>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="py-32 px-6 md:px-12 bg-primary text-white animate-fade-in" style={{ animationDelay: '0.8s' }}>
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-5xl font-bold mb-8 font-heading">Get Personalized Recommendations</h2>
                        <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto">
                            Download the app to receive daily tips and resources tailored to your child's exact age and stage.
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white text-primary text-lg px-12 py-5 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all"
                        >
                            Download App
                        </motion.button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
