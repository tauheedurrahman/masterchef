"use client";

/**
 * Customer auth state for the whole app.
 *
 * Mounted once in app/layout.tsx, alongside CartProvider, so every route shares
 * one session.
 *
 * Like the cart, the session is resolved only AFTER mount, by asking
 * /api/auth/session. The server render cannot know who is signed in, so the
 * first client paint must match its logged-out output; `loading` stays true
 * until that first check settles, and consumers should render a neutral state
 * rather than "signed out" while it is.
 *
 * Every mutation flows through here, so there is no SDK event to subscribe to —
 * the cookie-backed browser client does not expose one, and does not need to.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getSession,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  type AuthUser,
  type Customer,
  type Result,
  type Session,
} from "./auth";

interface AuthContextValue {
  user: AuthUser | null;
  customer: Customer | null;
  /** True until the initial session check settles. */
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (
    phone: string,
    password: string,
    name: string,
    email?: string
  ) => Promise<Result<Session>>;
  signIn: (phone: string, password: string) => Promise<Result<Session>>;
  signOut: () => Promise<Result<true>>;
  /** Re-reads the profile — call after editing it. */
  refresh: () => Promise<void>;
  /** Applies an updated profile locally without a round trip. */
  setCustomer: (customer: Customer) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Guards against a resolved promise writing state after unmount.
  const alive = useRef(true);

  const apply = useCallback((session: Session | null) => {
    if (!alive.current) return;
    setUser(session?.user ?? null);
    setCustomer(session?.customer ?? null);
  }, []);

  const refresh = useCallback(async () => {
    apply(await getSession());
  }, [apply]);

  useEffect(() => {
    alive.current = true;
    (async () => {
      apply(await getSession());
      if (alive.current) setLoading(false);
    })();
    return () => {
      alive.current = false;
    };
  }, [apply]);

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (phone, password, name, email) => {
      const result = await authSignUp(phone, password, name, email);
      if (result.data) apply(result.data);
      return result;
    },
    [apply]
  );

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (phone, password) => {
      const result = await authSignIn(phone, password);
      if (result.data) apply(result.data);
      return result;
    },
    [apply]
  );

  const signOut = useCallback<AuthContextValue["signOut"]>(async () => {
    const result = await authSignOut();
    // Clear locally even if the request failed — the cookies are gone either
    // way, and leaving the UI "signed in" would be a lie.
    apply(null);
    return result;
  }, [apply]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      customer,
      loading,
      isAuthenticated: !!user,
      signUp,
      signIn,
      signOut,
      refresh,
      setCustomer: (c: Customer) => setCustomer(c),
    }),
    [user, customer, loading, signUp, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
