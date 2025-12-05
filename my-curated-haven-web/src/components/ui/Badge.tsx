interface BadgeProps {
    children: React.ReactNode;
    variant?: "primary" | "secondary" | "accent" | "outline";
    className?: string;
}

export default function Badge({ children, variant = "primary", className = "" }: BadgeProps) {
    const variants = {
        primary: "bg-primary/10 text-primary-dark border-primary/20",
        secondary: "bg-secondary/10 text-secondary-dark border-secondary/20",
        accent: "bg-accent text-foreground border-accent",
        outline: "bg-transparent border-foreground/20 text-foreground/60",
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}
