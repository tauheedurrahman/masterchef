/**
 * Customer authentication — real InsForge auth, phone-first.
 *
 * Master Chef customers know their phone number, not an email address. InsForge
 * authenticates on email + password, so every phone is folded into a derived
 * address:
 *
 *     0345-0676764  ->  03450676764@masterchef.local
 *
 * That address is an internal identifier only. It is never shown, never mailed,
 * and the customer's real email (if they give one) is stored on the `customers`
 * row for order updates instead. `masterchef.local` is deliberately not a
 * routable domain — nothing should ever try to deliver to it.
 *
 * Sessions are the SDK's own: the access token lives in memory and is renewed
 * from an httpOnly refresh cookie. Nothing about auth is kept in localStorage.
 */

import { insforge } from "./insforge";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

/** A row from `customers` — the profile behind the auth account. */
export interface Customer {
  id: string;
  authId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  area: string | null;
  city: string | null;
  defaultAddress: string | null;
  defaultLandmark: string | null;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  createdAt: string | null;
}

export interface Session {
  user: AuthUser;
  customer: Customer | null;
}

/** Every export resolves to this rather than throwing. */
export interface Result<T> {
  data: T | null;
  error: string | null;
}

export type AuthEvent = "signedIn" | "signedOut" | "tokenRefreshed";

/* ------------------------------------------------------------------ *
 * Phone handling
 * ------------------------------------------------------------------ */

/** Pakistani mobile: 11 digits beginning 03. Accepts 0345-0676764 or 03450676764. */
export const PHONE_RE = /^03\d{2}-?\d{7}$/;

/** Strips everything that is not a digit. `0345-0676764` -> `03450676764`. */
export function phoneDigits(phone: string): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** Canonical display form: `0345-0676764`. */
export function formatPhone(phone: string): string {
  const d = phoneDigits(phone);
  return d.length === 11 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
}

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test((phone ?? "").trim());
}

/**
 * The internal login identifier for a phone number. Derived from digits only,
 * so `0345-0676764` and `03450676764` are the same account.
 */
export function phoneToEmail(phone: string): string {
  return `${phoneDigits(phone)}@masterchef.local`;
}

/* ------------------------------------------------------------------ *
 * Row mapping
 * ------------------------------------------------------------------ */

type RawCustomer = {
  id: string;
  auth_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  area: string | null;
  city: string | null;
  default_address: string | null;
  default_landmark: string | null;
  loyalty_points: number | null;
  total_orders: number | null;
  total_spent: number | null;
  created_at: string | null;
};

export function toCustomer(row: RawCustomer): Customer {
  return {
    id: row.id,
    authId: row.auth_id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    area: row.area,
    city: row.city,
    defaultAddress: row.default_address,
    defaultLandmark: row.default_landmark,
    loyaltyPoints: row.loyalty_points ?? 0,
    totalOrders: row.total_orders ?? 0,
    totalSpent: row.total_spent ?? 0,
    createdAt: row.created_at,
  };
}

/** Turns an SDK error into something a customer can read. */
function readableError(err: unknown, fallback: string): string {
  const e = err as { statusCode?: number; error?: string; message?: string } | null;
  if (!e) return fallback;
  if (e.error === "INVALID_CREDENTIALS" || e.statusCode === 401) {
    return "Invalid phone or password.";
  }
  if (e.error === "USER_ALREADY_EXISTS" || e.statusCode === 409) {
    return "That phone number is already registered.";
  }
  return e.message || fallback;
}

/* ------------------------------------------------------------------ *
 * Customer profile
 * ------------------------------------------------------------------ */

/**
 * The `customers` row for a signed-in auth user.
 *
 * RLS scopes this to the caller's own row, so it returns null both when no
 * profile exists and when the caller is not signed in.
 */
export async function getCustomer(authId: string): Promise<Customer | null> {
  const { data, error } = await insforge
    .database.from("customers")
    .select("*")
    .eq("auth_id", authId)
    .maybeSingle();

  if (error || !data) return null;
  return toCustomer(data as RawCustomer);
}

/* ------------------------------------------------------------------ *
 * Sign up / in / out
 * ------------------------------------------------------------------ */

/**
 * Creates the auth account and its `customers` row.
 *
 * `email` is the customer's real address and is optional — it goes on the
 * profile for order updates. The login identifier is always derived from the
 * phone number.
 *
 * If the profile insert fails (almost always a duplicate phone) the new session
 * is signed out again, so a half-made account cannot be used.
 */
export async function signUp(
  phone: string,
  password: string,
  name: string,
  email?: string
): Promise<Result<Session>> {
  const trimmedName = (name ?? "").trim();
  if (!trimmedName) return { data: null, error: "Please enter your full name." };
  if (!isValidPhone(phone)) return { data: null, error: "Enter a phone like 03XX-XXXXXXX." };
  if ((password ?? "").length < 6) {
    return { data: null, error: "Password must be at least 6 characters." };
  }

  const { data, error } = await insforge.auth.signUp({
    email: phoneToEmail(phone),
    password,
    name: trimmedName,
  });

  if (error || !data?.user) {
    return { data: null, error: readableError(error, "Could not create your account.") };
  }

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email,
    name: trimmedName,
  };

  const { data: inserted, error: profileError } = await insforge
    .database.from("customers")
    .insert([
      {
        auth_id: user.id,
        full_name: trimmedName,
        phone: formatPhone(phone),
        email: (email ?? "").trim() || null,
      },
    ])
    .select();

  if (profileError) {
    // Don't leave the caller holding a session with no profile behind it.
    await insforge.auth.signOut().catch(() => {});
    const dup = /duplicate|unique/i.test(
      (profileError as { message?: string }).message ?? ""
    );
    return {
      data: null,
      error: dup
        ? "That phone number is already registered."
        : "Account created but your profile could not be saved. Please contact us.",
    };
  }

  const row = (inserted as RawCustomer[] | null)?.[0];
  return { data: { user, customer: row ? toCustomer(row) : null }, error: null };
}

/** Signs in with phone + password. */
export async function signIn(phone: string, password: string): Promise<Result<Session>> {
  if (!isValidPhone(phone)) return { data: null, error: "Enter a phone like 03XX-XXXXXXX." };
  if (!password) return { data: null, error: "Please enter your password." };

  const { data, error } = await insforge.auth.signInWithPassword({
    email: phoneToEmail(phone),
    password,
  });

  if (error || !data?.user) {
    return { data: null, error: readableError(error, "Invalid phone or password.") };
  }

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email,
    name: (data.user.profile as { name?: string } | undefined)?.name ?? null,
  };

  return { data: { user, customer: await getCustomer(user.id) }, error: null };
}

export async function signOut(): Promise<Result<true>> {
  const { error } = await insforge.auth.signOut();
  if (error) return { data: null, error: readableError(error, "Could not sign out.") };
  return { data: true, error: null };
}

/**
 * The current session, or null when signed out.
 *
 * The SDK holds the access token in memory only, so on a fresh page load this
 * is what re-establishes the session from the httpOnly refresh cookie. There is
 * no `auth.getSession()` on the client — `getCurrentUser()` is the entry point.
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error || !data?.user) return null;

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email,
    name: (data.user.profile as { name?: string } | undefined)?.name ?? null,
  };
  return { user, customer: await getCustomer(user.id) };
}

/**
 * Subscribes to sign-in / sign-out / token-refresh. Returns an unsubscribe
 * function — call it on unmount.
 */
export function onAuthStateChange(callback: (event: AuthEvent) => void): () => void {
  return insforge.auth.onAuthStateChange((event) => callback(event as AuthEvent));
}
