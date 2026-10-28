import { useCallback, useEffect, useState } from "react";

import { ApiError } from "./client";

export type Load<T> = { state: "loading" } | { state: "ready"; data: T } | { state: "failed"; message: string };

export function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Try again.";
}

/**
 * Runs `fetcher` on mount and whenever it changes (memoize it with useCallback), and
 * again on `reload()`. A response that arrives after unmount or a newer run is dropped.
 */
export function useLoad<T>(fetcher: () => Promise<T>): [Load<T>, () => void] {
  const [load, setLoad] = useState<Load<T>>({ state: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    fetcher().then(
      (data) => {
        if (live) setLoad({ state: "ready", data });
      },
      (e: unknown) => {
        if (live) setLoad({ state: "failed", message: errorText(e) });
      },
    );
    return () => {
      live = false;
    };
  }, [fetcher, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return [load, reload];
}
