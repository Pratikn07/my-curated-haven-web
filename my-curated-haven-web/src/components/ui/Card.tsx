"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export default function Card({ children, className = "", hoverEffect = true }: CardProps) {
    return (
        <motion.div
            whileHover={hoverEffect ? { y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`glass-panel rounded-3xl p-8 border border-white/50 shadow-sm ${className}`}
        >
            {children}
        </motion.div>
    );
}
