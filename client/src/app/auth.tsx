import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { loginUser, registerUser } from "../services/authService";
import {
  deleteSavedLocation,
  loadSavedLocations,
  loadUserPreferences,
  saveLocation,
  saveUserPreferences,
} from "../services/databaseService";
import type { Location } from "../types/location";

export interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
}

export type UnitSystem = "metric" | "imperial";

export interface UserPreferences {
  homeBase: string;
  radiusKm: number;
  units: UnitSystem;
}

interface AuthValue {
  user: User | null;
  savedLocationIds: string[];
  savedLocations: Location[];
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  requireAuth: (reason: string, action: () => void) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (user: User & { password: string }) => Promise<void>;
  signOut: () => void;
  toggleSaved: (id: string, location?: Location) => void;
 
  prompt: { open: boolean; reason: string };
  closePrompt: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);
const SESSION_KEY = "setradar-session";
const SAVED_LOCATIONS_KEY = "setradar-saved-locations";
const PREFERENCES_KEY = "setradar-preferences";
const TOKEN_KEY = "setradar-access-token";
const DEFAULT_PREFERENCES: UserPreferences = {
  homeBase: "",
  radiusKm: 50,
  units: "metric",
};

function readStoredUser(): User | null {
  try {
    const value = window.localStorage.getItem(SESSION_KEY);
    return value ? (JSON.parse(value) as User) : null;
  } catch {
    return null;
  }
}

function savedKey(user: User | null) {
  return user ? `${SAVED_LOCATIONS_KEY}:${user.id ?? user.email}` : "";
}

function readSavedLocations(user: User | null): Location[] {
  if (!user) return [];
  try {
    const value = window.localStorage.getItem(savedKey(user));
    return value ? (JSON.parse(value) as Location[]) : [];
  } catch {
    return [];
  }
}

function preferencesKey(user: User | null) {
  return user ? `${PREFERENCES_KEY}:${user.id ?? user.email}` : "";
}

function readPreferences(user: User | null): UserPreferences {
  if (!user) return DEFAULT_PREFERENCES;
  try {
    const value = window.localStorage.getItem(preferencesKey(user));
    return value
      ? {
          ...DEFAULT_PREFERENCES,
          ...(JSON.parse(value) as Partial<UserPreferences>),
        }
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [savedLocations, setSavedLocations] = useState<Location[]>(() =>
    readSavedLocations(readStoredUser()),
  );
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    readPreferences(readStoredUser()),
  );
  const [prompt, setPrompt] = useState({ open: false, reason: "" });
  const [pending, setPending] = useState<(() => void) | null>(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setSavedLocations([]);
      setPreferences(DEFAULT_PREFERENCES);
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
      setPrompt({
        open: true,
        reason: "Your session expired. Please sign in again.",
      });
    };
    window.addEventListener("setradar:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("setradar:unauthorized", handleUnauthorized);
  }, []);

  const requireAuth = useCallback(
    (reason: string, action: () => void) => {
      if (user) {
        action();
      } else {
        setPending(() => action);
        setPrompt({ open: true, reason });
      }
    },
    [user],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await loginUser(email, password);
      const profile = response.user;
      if (!profile) throw new Error("Could not complete sign in.");
      setUser(profile);
      setSavedLocations(readSavedLocations(profile));
      setPreferences(readPreferences(profile));
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
      if (response.token)
        window.localStorage.setItem(TOKEN_KEY, response.token);
      setPrompt({ open: false, reason: "" });
      if (pending) {
        pending();
        setPending(null);
      }
    },
    [pending],
  );

  const signUp = useCallback(
    async (newUser: User & { password: string }) => {
      const response = await registerUser(newUser);
      const profile = response.user;
      if (!profile) throw new Error("Could not complete registration.");
      setUser(profile);
      setSavedLocations(readSavedLocations(profile));
      setPreferences(readPreferences(profile));
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
      if (response.token)
        window.localStorage.setItem(TOKEN_KEY, response.token);
      setPrompt({ open: false, reason: "" });
      if (pending) {
        pending();
        setPending(null);
      }
    },
    [pending],
  );

  const signOut = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    setSavedLocations([]);
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const toggleSaved = useCallback((id: string, location?: Location) => {
    setSavedLocations((prev) => {
      const next = prev.some((item) => item.id === id)
        ? prev.filter((item) => item.id !== id)
        : location
          ? [...prev, location]
          : prev;
      return next;
    });
    if (!user) return
    const existing = savedLocations.some((item) => item.id === id)
    void (existing ? deleteSavedLocation(id) : location ? saveLocation(location) : Promise.resolve())
      .catch((error) => {
        console.error("[SetRadar] Could not persist saved location", error)
        setSavedLocations((current) =>
          existing
            ? location
              ? [...current, location]
              : current
            : current.filter((item) => item.id !== id),
        )
      })
  }, [savedLocations, user]);

  const savedLocationIds = savedLocations.map((location) => location.id);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch }
      if (user) {
        void saveUserPreferences(next).catch((error) =>
          console.error("[SetRadar] Could not save preferences", error),
        )
      }
      return next
    })
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSavedLocations()
        .then(setSavedLocations)
        .catch((error) =>
          console.error("[SetRadar] Could not load saved locations", error),
        )
      loadUserPreferences()
        .then((stored) => setPreferences((current) => ({ ...current, ...stored })))
        .catch((error) =>
          console.error("[SetRadar] Could not load preferences", error),
        )
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(
        preferencesKey(user),
        JSON.stringify(preferences),
      );
    }
  }, [user, preferences]);

  const closePrompt = useCallback(
    () => setPrompt({ open: false, reason: "" }),
    [],
  );

  const value = useMemo(
    () => ({
      user,
      savedLocationIds,
      savedLocations,
      preferences,
      updatePreferences,
      requireAuth,
      signIn,
      signUp,
      signOut,
      toggleSaved,
      prompt,
      closePrompt,
    }),
    [
      user,
      savedLocationIds,
      savedLocations,
      preferences,
      updatePreferences,
      requireAuth,
      signIn,
      signUp,
      signOut,
      toggleSaved,
      prompt,
      closePrompt,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
