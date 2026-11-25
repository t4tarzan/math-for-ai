import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk runs on every request so server code can call auth().
// No page requires sign-in: lessons are open, and signing in only adds cloud sync.
// API routes check auth() themselves.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|pyodide/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|wasm|whl|data|zip)).*)",
    "/(api|trpc)(.*)",
  ],
};
