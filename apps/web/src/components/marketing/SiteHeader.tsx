import Link from "next/link";
import { AuthButton } from "@/components/auth/AuthButton";

interface SiteHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

/** One sticky top bar for every page (llm.wntap.org style): wordmark, two links, account. */
export function SiteHeader({ children, className }: SiteHeaderProps) {
  return (
    <header className={`sticky top-0 z-30 border-b border-[var(--rule)] bg-[var(--header-bg)] backdrop-blur ${className ?? ""}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
          <span className="font-display text-lg font-bold tracking-tight sm:text-xl">
            Math<span className="text-[var(--blueprint)]"> for AI</span>
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)] sm:inline">field guide · course</span>
        </Link>
        <nav className="flex items-center gap-1 whitespace-nowrap sm:gap-2">
          <Link href="/#catalogue" className="hidden rounded-full px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)] md:inline">
            Catalogue
          </Link>
          <Link href="/practice" className="hidden rounded-full px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)] md:inline">
            Practice
          </Link>
          <Link href="/projects" className="hidden rounded-full px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)] md:inline">
            Projects
          </Link>
          <Link href="/lessons" className="hidden rounded-full px-3 py-1.5 sm:inline text-sm text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)]">
            Lessons
          </Link>
          {children}
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}
