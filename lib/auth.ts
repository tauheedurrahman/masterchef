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
 * Where the work happens
 * ----------------------
 * The mutating calls below POST to /api/auth/*, they do not talk to InsForge
 * from the browser. That is forced by the SDK: a cookie-backed browser client
 * exposes only getCurrentUser/getProfile, and sign-in has to happen somewhere
 * that can write httpOnly cookies. The upside is that no access or refresh
 * token is ever visible to page JavaScript — the server strips them from the
 * response and keeps them in cookies the browser cannot read.
 */

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface AuthUser {
  id: string;
  email: string | null;
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
  /** Machine-readable hint for the UI, e.g. PHONE_TAKEN. */
  code?: string;
}

export type AuthEvent = "signedIn" | "signedOut";

/* ------------------------------------------------------------------ *
 * Phone handling
 * ------------------------------------------------------------------ */

/** Pakistani mobile: 11 digits beginning 03. Accepts 0345-0676764 or 03450676764. */
export const PHONE_RE = /^03\d{2}-?\d{7}$/;

/** Strips everything that is not a digit. `0345-0676764` -> `03450676764`. */
export function phoneDigits(phone: string): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** Canonical display and storage form: `0345-0676764`. */
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
 * Row mapping — shared by the client and the route handlers
 * ------------------------------------------------------------------ */

export type RawCustomer = {
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

/* ------------------------------------------------------------------ *
 * Calls into /api/auth
 * ------------------------------------------------------------------ */

async function post<T>(url: string, body?: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        data: null,
        error: (json.error as string) ?? "Something went wrong. Please try again.",
        code: json.code as string | undefined,
      };
    }
    return { data: json as T, error: null };
  } catch {
    return { data: null, error: "No connection. Check your internet and try again." };
  }
}

/**
 * Creates the account and signs the customer in.
 *
 * `email` is the customer's real address and is optional — it is stored on the
 * profile for order updates, never used to log in.
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
  return post<Session>("/api/auth/signup", {
    phone,
    password,
    name: trimmedName,
    email: (email ?? "").trim() || undefined,
  });
}

/** Signs in with phone + password. */
export async function signIn(phone: string, password: string): Promise<Result<Session>> {
  if (!isValidPhone(phone)) return { data: null, error: "Enter a phone like 03XX-XXXXXXX." };
  if (!password) return { data: null, error: "Please enter your password." };
  return post<Session>("/api/auth/signin", { phone, password });
}

export async function signOut(): Promise<Result<true>> {
  const res = await post<{ ok: true }>("/api/auth/signout");
  return { data: res.error ? null : true, error: res.error };
}

/**
 * The current session, or null when signed out.
 *
 * Resolved server-side from the auth cookies, so it survives a page reload
 * without anything being kept in localStorage.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as Session & { user: AuthUser | null };
    return json.user ? { user: json.user, customer: json.customer } : null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a phone number is already registered.
 *
 * Answered by the server with the admin key — RLS would otherwise show a
 * signed-out visitor no rows at all and every number would look available.
 */
export async function isPhoneAvailable(phone: string): Promise<boolean | null> {
  if (!isValidPhone(phone)) return null;
  try {
    const res = await fetch(
      `/api/auth/phone-available?phone=${encodeURIComponent(formatPhone(phone))}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { available?: boolean };
    return typeof json.available === "boolean" ? json.available : null;
  } catch {
    return null;
  }
}
