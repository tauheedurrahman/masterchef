"use client";

/**
 * Sign in / create account.
 *
 * Real InsForge auth via the /api/auth/* routes — the phone number is the login
 * identifier and the derived email never surfaces here.
 *
 * The two tabs share one `form` state object so switching between them keeps
 * whatever has been typed, which matters most when someone starts signing up,
 * discovers the number is taken, and follows the "Sign in instead?" link.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "./Icons";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/store";
import { formatPhone, isValidPhone, isPhoneAvailable } from "@/lib/auth";
import { SITE } from "@/lib/site";

type Tab = "signin" | "signup";

/** Inline eye / eye-off, matching the site's stroked icon style. */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

function Spinner() {
  return (
    <span className="auth-spin" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export default function AuthTabs() {
  const [tab, setTab] = useState<Tab>("signin");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    confirm: "",
    email: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phoneTaken, setPhoneTaken] = useState<boolean | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);

  const { signIn, signUp } = useAuth();
  const { notify } = useCart();
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/profile";

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const set = useCallback(
    (patch: Partial<typeof form>) => {
      setForm((prev) => ({ ...prev, ...patch }));
      setError(null);
      setErrorCode(null);
    },
    []
  );

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setErrorCode(null);
    setPhoneTaken(null);
  };

  /* ----------------------------- validation ----------------------------- */

  const phoneEntered = form.phone.trim().length > 0;
  const phoneValid = isValidPhone(form.phone);
  const phoneBad = phoneEntered && !phoneValid;
  const passwordsMismatch =
    tab === "signup" && form.confirm.length > 0 && form.password !== form.confirm;
  const passwordShort = tab === "signup" && form.password.length > 0 && form.password.length < 6;

  /** Runs on blur so we don't hammer the endpoint on every keystroke. */
  async function checkPhone() {
    if (tab !== "signup" || !phoneValid) return;
    setCheckingPhone(true);
    const available = await isPhoneAvailable(form.phone);
    if (!alive.current) return;
    setCheckingPhone(false);
    setPhoneTaken(available === null ? null : !available);
  }

  const canSubmit =
    !busy &&
    phoneValid &&
    form.password.length > 0 &&
    (tab === "signin" ||
      (form.name.trim().length > 0 && form.password.length >= 6 && !passwordsMismatch));

  /* ------------------------------- submit ------------------------------- */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);
    setErrorCode(null);

    const result =
      tab === "signin"
        ? await signIn(form.phone, form.password)
        : await signUp(form.phone, form.password, form.name, form.email || undefined);

    if (!alive.current) return;

    if (result.error || !result.data) {
      setBusy(false);
      setError(result.error ?? "Something went wrong. Please try again.");
      setErrorCode(result.code ?? null);
      return;
    }

    const name = result.data.customer?.fullName ?? result.data.user.name ?? "";
    notify(tab === "signin" ? `Welcome back, ${name.split(" ")[0]}!` : "Account created!");

    router.push(redirectTo);
    router.refresh();
  }

  /* -------------------------------- view -------------------------------- */

  return (
    <div className="auth__card">
      <span className="eyebrow">Master Chef account</span>
      <h1 style={{ fontSize: "clamp(2rem,4vw,2.8rem)", marginBottom: 26 }}>
        {tab === "signin" ? "Welcome back" : "Join the table"}
      </h1>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "signin"}
          data-active={tab === "signin" ? "true" : "false"}
          onClick={() => switchTab("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "signup"}
          data-active={tab === "signup" ? "true" : "false"}
          onClick={() => switchTab("signup")}
        >
          Create account
        </button>
      </div>

      <form className="stack" onSubmit={onSubmit} noValidate>
        {tab === "signup" && (
          <div className="form-field">
            <label htmlFor="auth-name">Full name</label>
            <input
              id="auth-name"
              className="input"
              placeholder="Bilal Khan"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              autoComplete="name"
              required
            />
          </div>
        )}

        <div className="form-field">
          <label htmlFor="auth-phone">Phone</label>
          <input
            id="auth-phone"
            className="input"
            inputMode="tel"
            placeholder="03XX-XXXXXXX"
            value={form.phone}
            onChange={(e) => {
              set({ phone: e.target.value });
              setPhoneTaken(null);
            }}
            onBlur={() => {
              if (phoneValid) set({ phone: formatPhone(form.phone) });
              checkPhone();
            }}
            autoComplete="tel"
            aria-invalid={phoneBad || phoneTaken === true}
            required
          />
          {phoneBad ? (
            <span className="auth-msg auth-msg--bad">Use the format 03XX-XXXXXXX.</span>
          ) : checkingPhone ? (
            <span className="hint">Checking…</span>
          ) : tab === "signup" && phoneTaken === true ? (
            <span className="auth-msg auth-msg--bad">
              Already registered.{" "}
              <button type="button" className="text-btn" onClick={() => switchTab("signin")}>
                Sign in instead?
              </button>
            </span>
          ) : tab === "signup" && phoneTaken === false ? (
            <span className="auth-msg auth-msg--ok">That number is available.</span>
          ) : (
            <span className="hint">We use this to confirm your orders.</span>
          )}
        </div>

        {tab === "signup" && (
          <div className="form-field">
            <label htmlFor="auth-email">Email (optional)</label>
            <input
              id="auth-email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              autoComplete="email"
            />
            <span className="hint">For order updates.</span>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="auth-pass">Password</label>
          <div className="auth-pass">
            <input
              id="auth-pass"
              className="input"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set({ password: e.target.value })}
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              aria-invalid={passwordShort}
              required
            />
            <button
              type="button"
              className="auth-pass__eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
          {passwordShort && (
            <span className="auth-msg auth-msg--bad">At least 6 characters.</span>
          )}
        </div>

        {tab === "signup" && (
          <div className="form-field">
            <label htmlFor="auth-confirm">Confirm password</label>
            <input
              id="auth-confirm"
              className="input"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.confirm}
              onChange={(e) => set({ confirm: e.target.value })}
              autoComplete="new-password"
              aria-invalid={passwordsMismatch}
              required
            />
            {passwordsMismatch ? (
              <span className="auth-msg auth-msg--bad">Passwords do not match.</span>
            ) : form.confirm.length > 0 ? (
              <span className="auth-msg auth-msg--ok">Passwords match.</span>
            ) : null}
          </div>
        )}

        {error && (
          <p className="auth-error" role="alert">
            {error}
            {errorCode === "PHONE_TAKEN" && (
              <>
                {" "}
                <button type="button" className="text-btn" onClick={() => switchTab("signin")}>
                  Sign in instead?
                </button>
              </>
            )}
          </p>
        )}

        <button type="submit" className="btn btn--block" disabled={!canSubmit}>
          {busy ? (
            <>
              <Spinner />
              {tab === "signin" ? "Signing in…" : "Creating account…"}
            </>
          ) : (
            <>
              {tab === "signin" ? "Sign in" : "Create account"} <ArrowRightIcon size={16} />
            </>
          )}
        </button>

        {tab === "signin" && (
          <p className="summary__note" style={{ textAlign: "center" }}>
            Forgot your password? Call us on{" "}
            <a href={`tel:${SITE.phoneTel[0]}`} style={{ color: "var(--accent-warm)" }}>
              {SITE.phones[0]}
            </a>
          </p>
        )}

        <p className="summary__note" style={{ textAlign: "center" }}>
          {tab === "signin" ? (
            <>
              No account yet?{" "}
              <button
                type="button"
                className="text-btn"
                onClick={() => switchTab("signup")}
                style={{ color: "var(--accent-warm)" }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already ordering with us?{" "}
              <button
                type="button"
                className="text-btn"
                onClick={() => switchTab("signin")}
                style={{ color: "var(--accent-warm)" }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </form>

      <p className="summary__note" style={{ textAlign: "center", marginTop: 18 }}>
        You can also{" "}
        <Link href="/menu" style={{ color: "var(--accent-warm)" }}>
          order as a guest
        </Link>
        .
      </p>
    </div>
  );
}
