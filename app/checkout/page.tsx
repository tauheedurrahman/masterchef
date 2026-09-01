import type { Metadata } from "next";
import Link from "next/link";
import CheckoutView from "@/components/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Master Chef order — delivery or pickup.",
};

export default function CheckoutPage() {
  return (
    <>
      <header className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/cart">Cart</Link>
            <span>/</span>
            <span>Checkout</span>
          </div>
          <span className="eyebrow">Last step</span>
          <h1>Checkout</h1>
        </div>
      </header>

      <CheckoutView />
    </>
  );
}
