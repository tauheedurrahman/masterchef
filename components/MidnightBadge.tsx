"use client";

import { useEffect, useState } from "react";
import { isMidnightDealTime } from "@/lib/hours";
import { MoonIcon } from "./Icons";

/**
 * Time-aware midnight-deals badge.
 *
 * Renders the static "after 10:30 PM" label on the server and during the first
 * client paint, then re-checks the *visitor's* clock after mount. Reading the
 * clock during render would risk a server/client mismatch.
 */
export default function MidnightBadge() {
  const [live, setLive] = useState(false);

  useEffect(() => {
    const check = () => setLive(isMidnightDealTime());
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={`badge ${live ? "badge--live" : "badge--gold"}`}>
      <MoonIcon size={12} />
      {live ? "Available now" : "Available after 10:30 PM"}
    </span>
  );
}
