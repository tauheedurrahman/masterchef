"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon } from "./Icons";
// From lib/sort, not lib/api: lib/api is server-only and throws in the browser.
import { SORT_OPTIONS } from "@/lib/sort";

/**
 * Sort control. Writes to the URL (?sort=…) rather than local state so the
 * server component re-renders the list and the link stays shareable.
 */
export default function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="select">
      <span className="count" style={{ marginRight: 10 }}>
        Sort
      </span>
      <select
        value={value}
        aria-label="Sort items"
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value === "featured") params.delete("sort");
          else params.set("sort", e.target.value);
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon />
    </label>
  );
}
