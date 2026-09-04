"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckIcon } from "./Icons";

/**
 * Enquiry form for /contact.
 *
 * Real: it POSTs to /api/contact, which stores the message so the owner can
 * call back. The form stays on screen and empties itself on success, because
 * people send a second message far more often than they re-read the first.
 */
export default function ContactForm() {
  const empty = { name: "", phone: "", email: "", message: "" };

  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not send your message.");

      setForm(empty);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send your message."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" style={{ marginBottom: 0 }} onSubmit={submit}>
      <div className="panel__head">
        <span className="panel__num">@</span>
        <h3>Send us a message</h3>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="c-name">
            Name <span className="req">*</span>
          </label>
          <input
            id="c-name"
            className="input"
            required
            placeholder="Your name"
            autoComplete="name"
            value={form.name}
            onChange={set("name")}
          />
        </div>
        <div className="form-field">
          <label htmlFor="c-phone">
            Phone <span className="req">*</span>
          </label>
          <input
            id="c-phone"
            className="input"
            inputMode="tel"
            required
            placeholder="03XX-XXXXXXX"
            autoComplete="tel"
            value={form.phone}
            onChange={set("phone")}
          />
        </div>
        <div className="form-field form-field--full">
          <label htmlFor="c-email">Email (optional)</label>
          <input
            id="c-email"
            className="input"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
          />
        </div>
        <div className="form-field form-field--full">
          <label htmlFor="c-msg">
            Message <span className="req">*</span>
          </label>
          <textarea
            id="c-msg"
            className="textarea"
            required
            placeholder="How can we help?"
            value={form.message}
            onChange={set("message")}
          />
        </div>
      </div>

      <button type="submit" className="btn" style={{ marginTop: 18 }} disabled={busy}>
        {busy ? "Sending…" : "Send message"} <ArrowRightIcon size={16} />
      </button>

      {sent && (
        <p
          className="free-delivery free-delivery--met"
          role="status"
          style={{ marginTop: 16 }}
        >
          <CheckIcon size={14} /> We received your message. We&apos;ll call you
          soon.
        </p>
      )}
      {error && (
        <p className="auth-msg auth-msg--bad" role="alert" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}
    </form>
  );
}
