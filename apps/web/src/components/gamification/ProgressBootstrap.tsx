"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { mergeRemoteProgress } from "@/lib/progress";
import { pullProgressFromServer, pushProgressToServer } from "@/lib/progress-sync";

/** Pull server progress once Clerk has loaded; push local progress whenever the learner is signed in. */
export function ProgressBootstrap() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    void (async () => {
      const remote = await pullProgressFromServer();
      if (remote) mergeRemoteProgress(remote);
      if (isSignedIn) await pushProgressToServer();
    })();
  }, [isLoaded, isSignedIn]);

  return null;
}
