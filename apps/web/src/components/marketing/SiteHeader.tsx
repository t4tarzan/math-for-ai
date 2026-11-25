import Link from "next/link";
import { AuthButton } from "@/components/auth/AuthButton";

interface SiteHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export function SiteHeader({ children, className }: SiteHeaderProps) {
  return (
    <header
      className={`mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6 ${className ?? ""}`}
    >
      <Link href="/" className="link-underline font-display text-2xl text-[var(--blueprint)]">
        Math for AI
      </Link>
      <div className="flex items-center gap-3">
        {children}
        <AuthButton />
      </div>
    </header>
  );
}
