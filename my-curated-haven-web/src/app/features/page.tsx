"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  MessageCircle,
  TrendingUp,
  BookOpen,
  Users,
  ShoppingBag,
  Camera,
  LayoutDashboard,
  UserPlus,
  Stethoscope,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield
} from "lucide-react";

export default function Features() {
  const features = [
    {
      id: "ai-assistant",
      title: "AI Parenting Assistant",
      description: "Our AI is trained on thousands of parenting resources and medical guidelines. Ask about sleep schedules, feeding tips, behavior challenges, or developmental questions—any time of day or night.",
      icon: MessageCircle,
      color: "text-primary",
      bgColor: "bg-primary/10",
      image: "/images/AI-chatbot.png",
      benefits: [
        "24/7 availability for your burning questions",
        "Evidence-based answers from trusted sources",
        "Personalized advice based on your child's profile",
        "No judgment, just support"
      ]
    },
    {
      id: "daily-tips",
      title: "Daily Tips",
      description: "Start every morning with a bite-sized piece of parenting wisdom tailored specifically to your child's exact age and developmental stage.",
      icon: Sparkles,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      image: "/images/Daily-tip.png",
      benefits: [
        "Age-specific advice delivered daily",
        "Quick reads for busy parents",
        "Actionable insights you can use immediately",
        "Covers sleep, feeding, play, and more"
      ]
    },
    {
      id: "milestones",
      title: "Milestone Tracker",
      description: "From first smiles to first steps, capture and celebrate every achievement. Our visual timeline makes it easy to see your child's progress and share special moments with loved ones.",
      icon: TrendingUp,
      color: "text-primary-dark",
      bgColor: "bg-accent",
      image: "/images/Milestone.png",
      benefits: [
        "Age-appropriate milestone suggestions",
        "Visual progress charts and timelines",
        "Photo and note attachments",
        "Shareable milestone cards"
      ]
    },
    {
      id: "resources",
      title: "Curated Resources",
      description: "Stop scrolling through endless forums. We bring you expert-vetted articles, videos, and guides tailored to your child's exact developmental stage.",
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
      image: "/images/Curated-Resources.png",
      benefits: [
        "Content matched to your child's age",
        "Vetted by pediatric experts",
        "Save and organize your favorite tips",
        "Deep dives into complex topics"
      ]
    },
    {
      id: "community",
      title: "Community Forum",
      description: "Connect with a supportive community of parents who understand exactly what you're going through. Share experiences, ask for advice, and build lasting friendships.",
      icon: Users,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      image: "/images/Community-Forum.png",
      benefits: [
        "Topic-based discussion boards",
        "Private groups for local parents",
        "Moderated for safety and support",
        "Weekly expert AMAs"
      ]
    },
    {
      id: "experts",
      title: "Expert Marketplace",
      description: "Get professional support when you need it most. Book virtual consultations with certified pediatricians, sleep consultants, lactation specialists, and child psychologists.",
      icon: Stethoscope,
      color: "text-primary-dark",
      bgColor: "bg-accent",
      image: "/images/Expert-Marketplace.png",
      benefits: [
        "Verified credentials for all experts",
        "Video consultations from home",
        "Secure messaging and follow-ups",
        "Transparent pricing and reviews"
      ]
    },
    {
      id: "shop",
      title: "Curated Shop",
      description: "Save time hunting for the best products. Browse our selection of high-quality, safety-tested baby gear, toys, and essentials recommended by experts and parents.",
      icon: ShoppingBag,
      color: "text-primary",
      bgColor: "bg-primary/10",
      image: "/images/Curated-Shop.png",
      benefits: [
        "Age-appropriate toy recommendations",
        "Eco-friendly and non-toxic options",
        "Exclusive discounts for members",
        "Gift registries and wishlists"
      ]
    },
    {
      id: "memory-lane",
      title: "Digital Memory Lane",
      description: "Create a beautiful, secure digital scrapbook of your child's life. Meaningful moments are automatically organized by age and milestone, ready to be cherished forever.",
      icon: Camera,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      image: "/images/Digital-Memory-Lane.png",
      benefits: [
        "Unlimited photo and video storage",
        "Automatic milestone tagging",
        "Printable photo books",
        "Time-capsule messages for the future"
      ]
    },
    {
      id: "dashboard",
      title: "Web Dashboard",
      description: "View your family's data on the big screen. Our comprehensive web dashboard gives you a deeper dive into trends, patterns, and insights from your computer.",
      icon: LayoutDashboard,
      color: "text-primary-dark",
      bgColor: "bg-accent",
      image: "/images/Web-Dashboard.png",
      benefits: [
        "Detailed sleep and feeding charts",
        "Exportable health reports for doctors",
        "Keyboard-friendly data entry",
        "Syncs instantly with mobile app"
      ]
    },
    {
      id: "secure-private",
      title: "Secure & Private",
      description: "Your family's privacy is our top priority. We use bank-level encryption to ensure your photos, notes, and chat history stay completely private and secure.",
      icon: Shield,
      color: "text-primary",
      bgColor: "bg-primary/10",
      image: "/images/Secure-and-Private.png",
      benefits: [
        "End-to-end encryption for personal data",
        "You own your data, always",
        "Strict privacy controls",
        "GDPR and COPPA compliant"
      ]
    },
    {
      id: "multi-child",
      title: "Multi-Child Profiles",
      description: "Parenting isn't one-size-fits-all. Manage profiles for all your children in one place, with personalized tracking, tips, and advice for each unique journey.",
      icon: UserPlus,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      image: "/images/Multi-Child-Profiles.png",
      benefits: [
        "Switch between profiles instantly",
        "Individual milestone tracking",
        "Age-appropriate tips for each child",
        "Unified family dashboard"
      ]
    },
    {
      id: "family-sharing",
      title: "Family Sharing",
      description: "It takes a village. Invite partners, grandparents, and caregivers to join your family circle, keeping everyone in the loop and on the same page.",
      icon: Users,
      color: "text-primary-dark",
      bgColor: "bg-accent",
      image: "/images/Family-Sharing.png",
      benefits: [
        "Granular permission controls",
        "Real-time updates for all caregivers",
        "Shared calendar and reminders",
        "Private family photo feed"
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative py-24 bg-gradient-subtle">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 font-heading tracking-tight">
                Features Built for <br />
                <span className="text-secondary">Modern Parents</span>
              </h1>
              <p className="text-xl text-foreground/70 max-w-2xl mx-auto mb-12 leading-relaxed font-body">
                Discover how My Curated Haven helps you navigate parenthood with confidence, one feature at a time.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Feature Deep Dives */}
        <div className="flex flex-col gap-8 md:gap-20 py-12 md:py-24">
          {features.map((feature, index) => (
            <div key={feature.id} className="py-8 md:py-16 px-6 md:px-12 relative animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-20">
                {/* Text Content */}
                <div className={`w-full md:w-3/5 ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                  <div className={`inline-flex p-4 rounded-2xl ${feature.bgColor} mb-8`}>
                    <feature.icon size={32} className={feature.color} />
                  </div>
                  <h2 className="text-4xl font-bold text-foreground mb-6 font-heading">{feature.title}</h2>
                  <p className="text-lg text-foreground/70 mb-8 leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-4">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3 text-foreground/80 font-medium">
                        <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center ${feature.bgColor}`}>
                          <div className={`w-2 h-2 rounded-full ${feature.color.replace('text-', 'bg-')}`} />
                        </div>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual Content */}
                <div className={`w-full md:w-2/5 ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                  <Card className="aspect-[4/3] relative overflow-hidden bg-white border-none shadow-xl shadow-black/5">
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      fill
                      className="object-cover"
                    />
                  </Card>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <section className="py-32 relative overflow-hidden bg-primary text-white">
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-5xl font-bold mb-8 font-heading">Ready to simplify your parenting journey?</h2>
            <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto">
              Join thousands of parents who are finding their calm with My Curated Haven.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-primary text-lg px-12 py-5 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 mx-auto"
            >
              Download App <ArrowRight size={20} />
            </motion.button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
