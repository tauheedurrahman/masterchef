import type { Metadata } from "next";
import AuthTabs from "@/components/AuthTabs";
import SafeImage from "@/components/SafeImage";
import { unsplash } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create a Master Chef account.",
};

export default function LoginPage() {
  return (
    <div className="auth">
      <div className="auth__media">
        <SafeImage
          src={unsplash("photo-1550547660-d9450f859349", 1200)}
          alt=""
          fill
          sizes="(max-width: 980px) 100vw, 50vw"
          style={{ objectFit: "cover" }}
        />
        <div className="auth__media-body">
          <span className="eyebrow">{SITE.tagline}</span>
          <h2>Order faster every time</h2>
          <p className="lede">
            Save your address, re-order your usual in two taps and get the
            midnight menu the moment it goes live.
          </p>
        </div>
      </div>

      <div className="auth__form-wrap">
        <AuthTabs />
      </div>
    </div>
  );
}
