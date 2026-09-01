import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import HeroSlideshow from "./HeroSlideshow";
import { ArrowDownIcon, ArrowRightIcon, TagIcon } from "./Icons";
import { HERO_IMAGES } from "@/lib/data";
import { SITE } from "@/lib/site";

/**
 * Full-viewport hero.
 *
 * Two variants, chosen at render time by whether a transcoded background video
 * exists on disk:
 *
 *   public/videos/hero.mp4 present  ->  muted autoplay loop video (server
 *                                       component, poster = hero-poster.jpg)
 *   absent                          ->  <HeroSlideshow>, a client component
 *                                       that crossfades three large stills
 *
 * To switch to the video hero, transcode a source clip into place, e.g.
 *   ffmpeg -i source.mov -an -vf "scale=-2:1080" -c:v libx264 -crf 23 \
 *          -movflags +faststart public/videos/hero.mp4
 *   ffmpeg -i public/videos/hero.mp4 -ss 2 -frames:v 1 public/images/hero-poster.jpg
 * No code change is needed — this component picks it up on the next render.
 */

const VIDEO_PATH = "public/videos/hero.mp4";
const POSTER_PATH = "public/images/hero-poster.jpg";

function hasFile(rel: string): boolean {
  try {
    // turbopackIgnore keeps this probe from pulling the whole project into
    // the server bundle's file trace — we only ever read two fixed paths.
    return fs.existsSync(path.join(/* turbopackIgnore: true */ process.cwd(), rel));
  } catch {
    return false;
  }
}

export default function Hero() {
  const hasVideo = hasFile(VIDEO_PATH);
  const hasPoster = hasFile(POSTER_PATH);

  return (
    <section className="hero">
      {hasVideo ? (
        <div className="hero__media">
          <video
            className="hero__video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={hasPoster ? "/images/hero-poster.jpg" : undefined}
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
        </div>
      ) : (
        <HeroSlideshow slides={HERO_IMAGES} />
      )}

      <div className="hero__scrim" />

      <div className="hero__inner">
        <div className="container">
          <div className="hero__content stagger">
            <span className="eyebrow">Peshawar · Gulbahar No. 3</span>

            <h1>
              <span>Hot and</span>
              <span>
                <em>Delicious</em>
              </span>
              <span>Full of Flavors</span>
            </h1>

            <p className="hero__tag">
              Zingers, shawarma, paratha rolls, pizza and continental — cooked
              fresh to order and delivered across Peshawar. Free delivery on
              orders over Rs 1,500.
            </p>

            <div className="hero__cta">
              <Link href="/menu" className="btn btn--lg">
                Order now <ArrowRightIcon />
              </Link>
              <Link href="/deals" className="btn btn--lg btn--ghost">
                <TagIcon size={17} /> View deals
              </Link>
            </div>

            <div className="hero__facts">
              <div className="hero__fact">
                <b>{SITE.etaMinutes}</b>
                <span>Average delivery</span>
              </div>
              <div className="hero__fact">
                <b>100% Halal</b>
                <span>Fresh daily</span>
              </div>
              <div className="hero__fact">
                <b>13 Deals</b>
                <span>Incl. midnight</span>
              </div>
              <div className="hero__fact">
                <b>{SITE.phones[0]}</b>
                <span>Call to order</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <a className="hero__scroll" href="#categories" aria-label="Scroll to the menu">
        <span>Scroll</span>
        <i aria-hidden="true" />
        <ArrowDownIcon size={15} />
      </a>
    </section>
  );
}
