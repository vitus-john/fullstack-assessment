import { useNavigate } from "react-router-dom";
import { useCart } from "../state/CartContext";
import { createOrder } from "../api";
import { useState } from "react";

export default function CartPage() {
  const { items, total, remove, clear } = useCart();
  const navigate = useNavigate();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  async function checkout() {
    if (items.length === 0 || checkingOut) return;

    setCheckingOut(true);
    setCheckoutError(null);

    try {
      const order = await createOrder({
        customerId: "customer_001",
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        totalAmount: Number(total.toFixed(2)),
      });
      clear();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <h1>Cart</h1>
        <p>Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Cart</h1>
      {checkoutError && <p className="error">{checkoutError}</p>}
      <ul className="cart-list">
        {items.map((item) => (
          <li key={item.productId} className="cart-item">
            <span>{item.name}</span>
            <span>
              {item.quantity} x ${item.price.toFixed(2)}
            </span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
            <button onClick={() => remove(item.productId)}>Remove</button>
          </li>
        ))}
      </ul>
      <div className="cart-total">
        <strong>Total:</strong> ${total.toFixed(2)}
      </div>
      <button className="primary" onClick={checkout} disabled={checkingOut}>
        {checkingOut ? "Checking out..." : "Checkout"}
      </button>
    </div>
  );
}
