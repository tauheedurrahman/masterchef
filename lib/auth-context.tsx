"use client";

/**
 * Customer auth state for the whole app.
 *
 * Mounted once in app/layout.tsx, alongside CartProvider, so every route shares
 * one session.
 *
 * Like the cart, the session is resolved only AFTER mount. The server has no
 * way to know who is signed in — the SDK keeps its access token in memory and
 * renews it from an httpOnly cookie — so the first client paint must match the
 * server's logged-out render. `loading` stays true until that first check
 * settles; consumers should render a neutral state rather than "signed out"
 * while it is true, otherwise the navbar flickers on every navigation.
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
  onAuthStateChange,
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
  /** Re-reads the `customers` row — call after editing the profile. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Guards against a resolved promise writing state after unmount, and against
  // a slow initial check clobbering a faster explicit sign-in.
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

    // The SDK reports the event only, not the session, so re-read on signal.
    // tokenRefreshed changes nothing the UI shows, so it is ignored.
    const unsubscribe = onAuthStateChange((event) => {
      if (event === "signedOut") {
        apply(null);
      } else if (event === "signedIn") {
        void refresh();
      }
    });

    return () => {
      alive.current = false;
      unsubscribe();
    };
  }, [apply, refresh]);

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
    // Clear locally even if the network call failed — the token is gone either
    // way and leaving the UI "signed in" would be a lie.
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
