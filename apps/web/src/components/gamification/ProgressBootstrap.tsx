"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { mergeRemoteProgress } from "@/lib/progress";
import { pullProgressFromServer, pushProgressToServer } from "@/lib/progress-sync";

/** Pull server progress on mount; re-sync when user signs in. */
export function ProgressBootstrap() {
  const { status } = useSession();
  const lastStatus = useRef<string>("loading");

  useEffect(() => {
    if (status === "loading") return;

    const signedInNow = status === "authenticated" && lastStatus.current !== "authenticated";

    void (async () => {
      const remote = await pullProgressFromServer();
      if (remote) mergeRemoteProgress(remote);
      if (signedInNow || status === "authenticated") {
        await pushProgressToServer();
      }
    })();

    lastStatus.current = status;
  }, [status]);

  return null;
}
