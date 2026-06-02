// Tiny path + query router using pushState / popstate.
import { useCallback, useEffect, useState } from "react";

// The app is written with root-relative paths ("/filer/x"), but GitHub Pages
// serves this fork from a subpath ("/congress-trading-monitor/"). Vite exposes
// that prefix as import.meta.env.BASE_URL ("/" in dev, the subpath in the Pages
// build). withBase() applies it when we write to the URL; stripBase() removes it
// when we read — so every call site stays root-relative and dev is unaffected.
const BASE = import.meta.env.BASE_URL || "/";
const BASE_NO_SLASH = BASE.replace(/\/$/, "");

export function withBase(path) {
  if (BASE === "/" || typeof path !== "string" || !path.startsWith("/")) return path;
  return BASE_NO_SLASH + path;
}

function stripBase(pathname) {
  if (BASE === "/") return pathname;
  if (pathname === BASE_NO_SLASH) return "/";
  if (pathname.startsWith(BASE_NO_SLASH + "/")) return pathname.slice(BASE_NO_SLASH.length);
  return pathname;
}

export function parseRoute(pathname = window.location.pathname, search = window.location.search) {
  const segments = stripBase(pathname).replace(/^\//, "").split("/").filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(search));
  if (segments.length === 0) return { name: "overview", query };
  if (segments[0] === "filer" && segments[1]) return { name: "filer", id: decodeURIComponent(segments[1]), query };
  if (segments[0] === "ticker" && segments[1])
    return { name: "ticker", symbol: decodeURIComponent(segments[1]), query };
  if (segments[0] === "filers") return { name: "filers", query };
  if (segments[0] === "tickers") return { name: "tickers", query };
  if (segments[0] === "trades") return { name: "trades", query };
  if (segments[0] === "about") return { name: "about", query };
  return { name: "overview", query };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute());
  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return route;
}

export function navigate(pathOrUrl, { replace = false } = {}) {
  const target = withBase(pathOrUrl);
  const current = window.location.pathname + window.location.search;
  if (target === current) return;
  if (replace) {
    window.history.replaceState({}, "", target);
  } else {
    window.history.pushState({}, "", target);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// Hook: synchronize arbitrary state <-> URL query string on a given route.
export function useQueryState(keys, initial) {
  const [state, setState] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const next = { ...initial };
    for (const k of keys) {
      const v = p.get(k);
      if (v != null && v !== "") next[k] = v;
    }
    return next;
  });

  const set = useCallback(
    (updater) => {
      setState((prev) => {
        const merged = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        // Reflect to URL
        const p = new URLSearchParams(window.location.search);
        for (const k of keys) {
          const v = merged[k];
          if (v == null || v === "" || v === initial[k]) p.delete(k);
          else p.set(k, v);
        }
        const qs = p.toString();
        const url = window.location.pathname + (qs ? `?${qs}` : "");
        window.history.replaceState({}, "", url);
        return merged;
      });
    },
    [keys, initial],
  );

  // Listen for popstate so browser nav still works
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      setState((prev) => {
        const next = { ...initial };
        for (const k of keys) {
          const v = p.get(k);
          if (v != null && v !== "") next[k] = v;
        }
        return next;
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [keys, initial]);

  return [state, set];
}
