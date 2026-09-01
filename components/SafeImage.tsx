"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { PLACEHOLDER_IMAGE } from "@/lib/data";

/**
 * next/image with a guaranteed fallback.
 *
 * Remote photo hosts go down, URLs rot, and an imported item can point at a
 * file that never made it into public/. Rather than render a broken image,
 * swap in the neutral house placeholder.
 */
export default function SafeImage({
  src,
  alt,
  ...rest
}: Omit<ImageProps, "src"> & { src: string }) {
  const [current, setCurrent] = useState(src);

  // Keep up with prop changes (e.g. the gallery switching photos).
  useEffect(() => {
    setCurrent(src);
  }, [src]);

  return (
    <Image
      {...rest}
      src={current}
      alt={alt}
      onError={() => {
        if (current !== PLACEHOLDER_IMAGE) setCurrent(PLACEHOLDER_IMAGE);
      }}
      unoptimized={current === PLACEHOLDER_IMAGE}
    />
  );
}
