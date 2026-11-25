import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "katex/dist/katex.min.css";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ProgressBootstrap } from "@/components/gamification/ProgressBootstrap";
import "./globals.css";

// Headlines in a bookish serif (the field guide's voice), body in Inter, code in JetBrains Mono.
const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code",
});

export const metadata: Metadata = {
  title: "Math for AI — the math behind every AI system, learned by building",
  description:
    "542 lessons from vectors to agent harnesses: read, run the code, pass the quiz, then build and host capstones on a local AWS emulator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/signin"
      signUpUrl="/signup"
      appearance={{ variables: { colorPrimary: "#4b44d6", borderRadius: "0.75rem" } }}
      localization={{
        signIn: { start: { title: "Sign in to Math for AI", subtitle: "Continue with Google or your email" } },
        signUp: { start: { title: "Create your Math for AI account", subtitle: "Free to start. Continue with Google or your email" } },
      }}
    >
      <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} h-full`}>
        <body className="min-h-full font-body antialiased">
          <AnalyticsProvider>
            <ProgressBootstrap />
            {children}
          </AnalyticsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
