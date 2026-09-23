export const SITE_ORIGIN = "https://mycuratedhaven.com";

export const SUPPORT_EMAIL = "support@mycuratedhaven.com";

export type NavLink = {
  href: string;
  label: string;
};

export const headerLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "Recipes" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
];

export const footerLinks: NavLink[] = [
  { href: "/recipes", label: "Recipes" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export const indexableRoutes: {
  path: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/recipes", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/support", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];
