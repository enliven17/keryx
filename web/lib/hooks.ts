"use client";

import { useEffect, useState } from "react";
import type { Deployment } from "./deployment";

/** Fetch the on-chain deployment (contract addresses) from the server route. */
export function useDeployment() {
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/deployment")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http ${r.status}`))))
      .then((d) => alive && setDeployment(d))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);
  return { deployment, error };
}

/** Poll a function on an interval; returns the latest value. */
export function usePoll<T>(fn: () => Promise<T>, ms: number, deps: unknown[] = []): T | null {
  const [val, setVal] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const v = await fn();
      if (alive) setVal(v);
    };
    void tick();
    const id = setInterval(tick, ms);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return val;
}
