"use client";

import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** transition-delay in ms, used to stagger sibling reveals */
  stagger?: number;
}

export function Reveal({ children, className, stagger = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      setRevealed(true);
      return;
    }

    setArmed(true);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties | undefined = revealed
    ? { transitionDelay: stagger ? `${stagger}ms` : undefined }
    : undefined;

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "transition-all duration-500 ease-out will-change-transform",
        armed && !revealed && "translate-y-[14px] opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
