"use client";

import { useEffect, useState } from "react";
import SafeImage from "./SafeImage";

/**
 * Fallback hero background: an auto-rotating crossfade of large food shots.
 * Used when no public/videos/hero.mp4 exists (see components/Hero.tsx).
 */
export default function HeroSlideshow({
  slides,
}: {
  slides: { src: string; alt: string }[];
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      6000
    );
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <>
      <div className="hero__media">
        {slides.map((s, i) => (
          <div
            key={s.src}
            className="hero__slide"
            data-active={i === active ? "true" : "false"}
            aria-hidden={i !== active}
          >
            <SafeImage
              src={s.src}
              alt={i === active ? s.alt : ""}
              fill
              priority={i === 0}
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        ))}
      </div>

      <div className="hero__dots" role="tablist" aria-label="Hero slides">
        {slides.map((s, i) => (
          <button
            key={s.src}
            type="button"
            className="hero__dot"
            data-active={i === active ? "true" : "false"}
            onClick={() => setActive(i)}
            aria-label={`Show slide ${i + 1}`}
            aria-selected={i === active}
            role="tab"
          />
        ))}
      </div>
    </>
  );
}
