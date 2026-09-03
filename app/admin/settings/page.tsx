"use client";

import { useState } from "react";

export default function AdminSettingsPage() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);

    if (newPassword !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not change your password.");
      setNotice("Password changed.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Settings</h1>
          <p className="adm__sub">Admin account</p>
        </div>
      </div>

      <div className="adm__card" style={{ maxWidth: 420 }}>
        <h3 style={{ fontSize: 14, marginBottom: 14 }}>Change password</h3>

        {error && <div className="adm__error">{error}</div>}
        {notice && <div className="adm__ok">{notice}</div>}

        <form onSubmit={submit}>
          <div className="adm__field">
            <label htmlFor="cur">Current password</label>
            <input id="cur" type="password" value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password" required />
          </div>
          <div className="adm__field">
            <label htmlFor="new">New password</label>
            <input id="new" type="password" value={newPassword}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password" required minLength={8} />
          </div>
          <div className="adm__field">
            <label htmlFor="conf">Confirm new password</label>
            <input id="conf" type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password" required minLength={8} />
          </div>
          <button type="submit" className="adm__btn" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </button>
        </form>
      </div>
    </>
  );
}
