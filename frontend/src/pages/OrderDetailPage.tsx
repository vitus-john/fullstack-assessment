import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { chargeOrder, getOrder } from "../api";
import type { Order } from "../types";

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;
    let inFlight = false;

    const refreshOrder = async () => {
      if (inFlight) {
        return;
      }

      inFlight = true;

      try {
        const nextOrder = await getOrder(id);
        if (active) {
          setOrder(nextOrder);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load order");
        }
      } finally {
        inFlight = false;
      }
    };

    refreshOrder();
    const intervalId = window.setInterval(refreshOrder, 2000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [id]);

  if (!order) return <p>Loading order...</p>;

  async function pay() {
    const currentOrder = order;
    if (!currentOrder || paying) return;
    setPaying(true);
    setError(null);

    try {
      const result = await chargeOrder(currentOrder.id);
      setOrder(result.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="page">
      <h1>Order #{order.id}</h1>
      {error && <p className="error">{error}</p>}
      <p>
        Status: <span className={`status ${order.status}`}>{order.status}</span>
      </p>
      <p>Total: ${order.totalAmount}</p>

      <h2>Items</h2>
      <ul>
        {(order.items || []).map((item) => (
          <li key={item.id}>
            {item.name} x {item.quantity} @ ${item.unitPrice}
          </li>
        ))}
      </ul>

      <h2>Payments</h2>
      {(order.payments || []).length === 0 && <p>No payments yet.</p>}
      <ul>
        {(order.payments || []).map((p) => (
          <li key={p.id}>
            {p.status} - ${p.amount} ({p.providerTxnId})
          </li>
        ))}
      </ul>

      {order.status === "PENDING" && (
        <button className="order-btn" onClick={pay} disabled={paying}>
          {paying ? "Charging..." : "Pay now"}
        </button>
      )}
    </div>
  );
}
