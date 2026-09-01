"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckIcon } from "./Icons";

/** UI only — no list is actually subscribed to. */
export default function NewsletterForm() {
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="free-delivery free-delivery--met" style={{ marginTop: 0 }}>
        <CheckIcon size={14} /> You&apos;re on the list — deals and midnight
        specials will land on WhatsApp.
      </p>
    );
  }

  return (
    <form
      className="newsletter__form"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) setDone(true);
      }}
    >
      <input
        type="text"
        inputMode="tel"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="WhatsApp number or email"
        aria-label="WhatsApp number or email"
        required
      />
      <button type="submit" className="btn btn--gold">
        Notify me <ArrowRightIcon size={16} />
      </button>
    </form>
  );
}
