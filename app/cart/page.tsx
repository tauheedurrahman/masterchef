import type { Metadata } from "next";
import Link from "next/link";
import CartView from "@/components/CartView";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your Master Chef order before checkout.",
};

export default function CartPage() {
  return (
    <>
      <header className="page-head">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Cart</span>
          </div>
          <span className="eyebrow">Almost there</span>
          <h1>Your cart</h1>
        </div>
      </header>

      <CartView />
    </>
  );
}
