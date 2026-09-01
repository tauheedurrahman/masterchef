"use client";

import { useState } from "react";
import SafeImage from "./SafeImage";

/** Main image + thumbnail strip on the item detail page. */
export default function ItemGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const unique = images.filter((src, i) => images.indexOf(src) === i);
  const [active, setActive] = useState(0);

  return (
    <div className="gallery">
      <div className="gallery__main">
        <SafeImage
          src={unique[active] ?? images[0]}
          alt={alt}
          fill
          priority
          sizes="(max-width: 980px) 100vw, 600px"
          style={{ objectFit: "cover" }}
        />
      </div>

      {unique.length > 1 && (
        <div className="gallery__thumbs">
          {unique.map((src, i) => (
            <button
              key={src}
              type="button"
              className="gallery__thumb"
              data-active={i === active ? "true" : "false"}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1} of ${alt}`}
            >
              <SafeImage src={src} alt="" fill sizes="90px" style={{ objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
