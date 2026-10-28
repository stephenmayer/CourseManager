import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "./client";

export type Load<T> = { state: "loading" } | { state: "ready"; data: T } | { state: "failed"; message: string };

export function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Try again.";
}

/**
 * Runs `fetcher` on mount and whenever it changes (memoize it with useCallback). `reload()`
 * runs it again and resolves once the new result is on screen, so callers can keep their
 * controls disabled until then. A response that arrives after unmount is dropped.
 */
export function useLoad<T>(fetcher: () => Promise<T>): [Load<T>, () => Promise<void>] {
  const [load, setLoad] = useState<Load<T>>({ state: "loading" });
  const live = useRef(true);

  const run = useCallback(
    () =>
      fetcher().then(
        (data) => {
          if (live.current) setLoad({ state: "ready", data });
        },
        (e: unknown) => {
          if (live.current) setLoad({ state: "failed", message: errorText(e) });
        },
      ),
    [fetcher],
  );

  useEffect(() => {
    live.current = true;
    void run();
    return () => {
      live.current = false;
    };
  }, [run]);

  return [load, run];
}
