"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckIcon } from "./Icons";

/** UI-only enquiry form. Nothing is transmitted. */
export default function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="panel" style={{ marginBottom: 0 }}>
        <p className="free-delivery free-delivery--met" style={{ marginTop: 0 }}>
          <CheckIcon size={14} /> Thanks — message noted. For anything urgent,
          please call us instead.
        </p>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setSent(false)}
          style={{ marginTop: 16 }}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      className="panel"
      style={{ marginBottom: 0 }}
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="panel__head">
        <span className="panel__num">@</span>
        <h3>Send us a message</h3>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="c-name">
            Name <span className="req">*</span>
          </label>
          <input id="c-name" className="input" required placeholder="Your name" />
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
          />
        </div>
        <div className="form-field form-field--full">
          <label htmlFor="c-subject">Subject</label>
          <input id="c-subject" className="input" placeholder="Order enquiry, feedback, catering…" />
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
          />
        </div>
      </div>

      <button type="submit" className="btn" style={{ marginTop: 18 }}>
        Send message <ArrowRightIcon size={16} />
      </button>
      <p className="summary__note">
        Demo form — messages are not delivered. Please call for anything urgent.
      </p>
    </form>
  );
}
