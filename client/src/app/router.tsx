import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { ResearchResult } from "../types/research";

export type Route =
  | { name: "home" }
  | { name: "how"; section?: string }
  | { name: "results"; result: ResearchResult }
  | { name: "location"; id: string }
  | { name: "projects" }
  | { name: "project"; id: string }
  | { name: "research"; prompt?: string }
  | { name: "comparison" }
  | { name: "signin" }
  | { name: "signup" }
  | { name: "profile" };

interface RouterValue {
  route: Route;
  navigate: (route: Route) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterValue | null>(null);

const ROUTE_STATE_KEY = "setradar-route";

function pathForRoute(route: Route) {
  switch (route.name) {
    case "home":
      return "/discover";
    case "how":
      return route.section
        ? `/howitworks?section=${encodeURIComponent(route.section)}`
        : "/howitworks";
    case "results":
      return "/results";
    case "location":
      return `/locations/${encodeURIComponent(route.id)}`;
    case "projects":
      return "/projects";
    case "project":
      return `/projects/${encodeURIComponent(route.id)}`;
    case "research":
      return route.prompt
        ? `/research?prompt=${encodeURIComponent(route.prompt)}`
        : "/research";
    case "comparison":
      return "/compare";
    case "signin":
      return "/signin";
    case "signup":
      return "/signup";
    case "profile":
      return "/profile";
  }
}

function routeForLocation(state: unknown): Route {
  const savedRoute =
    state && typeof state === "object" && ROUTE_STATE_KEY in state
      ? (state as { [ROUTE_STATE_KEY]: Route })[ROUTE_STATE_KEY]
      : undefined;
  if (savedRoute) return savedRoute;

  const path = window.location.pathname.replace(/\/$/, "") || "/discover";
  const segments = path.split("/").filter(Boolean).map(decodeURIComponent);
  if (path === "/" || path === "/discover") return { name: "home" };
  if (path === "/howitworks" || path === "/how") {
    const section =
      new URLSearchParams(window.location.search).get("section") ?? undefined;
    return { name: "how", section };
  }
  if (path === "/research") {
    const prompt =
      new URLSearchParams(window.location.search).get("prompt") ?? undefined;
    return { name: "research", prompt };
  }
  if (path === "/projects") return { name: "projects" };
  if (segments[0] === "projects" && segments[1])
    return { name: "project", id: segments[1] };
  if (path === "/compare" || path === "/comparison")
    return { name: "comparison" };
  if (path === "/signin") return { name: "signin" };
  if (path === "/signup") return { name: "signup" };
  if (path === "/profile") return { name: "profile" };
  if (path === "/results") return { name: "home" };
  if (segments[0] === "locations" && segments[1])
    return { name: "location", id: segments[1] };
  return { name: "home" };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => {
    const initialRoute = routeForLocation(window.history.state);
    window.history.replaceState(
      { [ROUTE_STATE_KEY]: initialRoute },
      "",
      pathForRoute(initialRoute),
    );
    return initialRoute;
  });

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      setRoute(routeForLocation(event.state));
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((r: Route) => {
    window.history.pushState({ [ROUTE_STATE_KEY]: r }, "", pathForRoute(r));
    setRoute(r);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);
  const goBack = useCallback(() => {
    window.history.back();
  }, []);
  const value = useMemo(
    () => ({ route, navigate, goBack }),
    [route, navigate, goBack],
  );
  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter must be used within RouterProvider");
  return ctx;
}
