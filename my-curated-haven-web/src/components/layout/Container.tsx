import { ReactNode } from "react";

export default function Container({
  children,
  reading = false,
  className = "",
}: {
  children: ReactNode;
  reading?: boolean;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${reading ? "max-w-[65ch]" : "max-w-6xl"} ${className}`}>
      {children}
    </div>
  );
}
