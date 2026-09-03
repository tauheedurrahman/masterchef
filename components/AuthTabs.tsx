"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon } from "./Icons";

/** Sign in / create account — UI only, nothing is authenticated. */
export default function AuthTabs() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");

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
          onClick={() => setTab("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "signup"}
          data-active={tab === "signup" ? "true" : "false"}
          onClick={() => setTab("signup")}
        >
          Create account
        </button>
      </div>

      <form
        className="stack"
        onSubmit={(e) => e.preventDefault()}
      >
        {tab === "signup" && (
          <div className="form-field">
            <label htmlFor="auth-name">Full name</label>
            <input id="auth-name" className="input" placeholder="Bilal Khan" required />
          </div>
        )}

        <div className="form-field">
          <label htmlFor="auth-phone">Phone</label>
          <input
            id="auth-phone"
            className="input"
            inputMode="tel"
            placeholder="03XX-XXXXXXX"
            required
          />
          <span className="hint">We use this to confirm your orders.</span>
        </div>

        {tab === "signup" && (
          <div className="form-field">
            <label htmlFor="auth-email">Email (optional)</label>
            <input id="auth-email" className="input" type="email" placeholder="you@example.com" />
          </div>
        )}

        <div className="form-field">
          <label htmlFor="auth-pass">Password</label>
          <input
            id="auth-pass"
            className="input"
            type="password"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="btn btn--block">
          {tab === "signin" ? "Sign in" : "Create account"}{" "}
          <ArrowRightIcon size={16} />
        </button>

        <p className="summary__note" style={{ textAlign: "center" }}>
          {tab === "signin" ? (
            <>
              No account yet?{" "}
              <button
                type="button"
                className="text-btn"
                onClick={() => setTab("signup")}
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
                onClick={() => setTab("signin")}
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
