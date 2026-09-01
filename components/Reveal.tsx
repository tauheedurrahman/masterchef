"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

/**
 * Scroll-reveal wrapper built on IntersectionObserver.
 *
 *   <Reveal>            fades a single block up
 *   <Reveal group>      staggers its direct children (see .reveal-group in CSS)
 *
 * Reveals once, then disconnects — no observer churn while scrolling back.
 */
export default function Reveal({
  children,
  group = false,
  as: Tag = "div",
  className = "",
  delay = 0,
  threshold = 0.12,
  style,
}: {
  children: ReactNode;
  group?: boolean;
  as?: ElementType;
  className?: string;
  delay?: number;
  threshold?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No observer (or reduced motion): show immediately.
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (delay) window.setTimeout(() => setVisible(true), delay);
            else setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  const cls = [group ? "reveal-group" : "reveal", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      ref={ref}
      className={cls}
      style={style}
      data-visible={visible ? "true" : "false"}
    >
      {children}
    </Tag>
  );
}
