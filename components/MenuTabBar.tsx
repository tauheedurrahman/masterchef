"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sticky category tab bar for /menu.
 *
 * Scroll-spies the section anchors and slides the active underline. Clicking a
 * tab scrolls to that section (native smooth scrolling, offset by the CSS
 * `scroll-padding-top` on <html>).
 */
export default function MenuTabBar({
  tabs,
}: {
  tabs: { id: string; label: string }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = tabs
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // The section closest to the top of the viewport wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [tabs]);

  // Keep the active tab in view on narrow screens.
  useEffect(() => {
    const bar = barRef.current;
    const el = bar?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!bar || !el) return;
    const left = el.offsetLeft - bar.clientWidth / 2 + el.clientWidth / 2;
    bar.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  return (
    <div className="tabbar">
      <div className="container" style={{ padding: 0 }}>
        <div className="scroll-x no-bar" ref={barRef}>
          <nav className="tabbar__inner" aria-label="Menu categories">
            {tabs.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                data-tab={t.id}
                className="tab"
                data-active={active === t.id ? "true" : "false"}
              >
                {t.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
