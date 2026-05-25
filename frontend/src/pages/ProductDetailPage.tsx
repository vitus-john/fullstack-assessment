import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createOrder, getProduct } from "../api";
import { useCart } from "../state/CartContext";
import type { Product } from "../types";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getProduct(id)
      .then((nextProduct) => {
        if (active) {
          setProduct(nextProduct);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load product");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!product) return <p>Product not found.</p>;

  const canPurchase = product.stock > 0 && quantity > 0 && quantity <= product.stock;

  async function buyNow() {
    if (!product || !canPurchase || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const order = await createOrder({
        customerId: "customer_001",
        items: [{ productId: product.id, quantity }],
        totalAmount: Number((Number(product.price) * quantity).toFixed(2)),
      });
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>{product.name}</h1>
      <p className="sku">{product.sku}</p>
      <p className="description">{product.description}</p>
      <p className="price">${product.price}</p>
      <p className="stock">
        {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
      </p>
      {product.stock === 0 && <p className="error">This item is out of stock.</p>}
      <div className="qty-row">
        <input
          type="number"
          min={1}
          max={Math.max(product.stock, 1)}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          disabled={product.stock === 0}
        />
      </div>
      {!canPurchase && product.stock > 0 && (
        <p className="error">Please choose a quantity within available stock.</p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button onClick={() => add(product, quantity)} disabled={!canPurchase}>
          Add to cart
        </button>
        <button onClick={buyNow} className="primary" disabled={!canPurchase || submitting}>
          {submitting ? "Buying..." : "Buy now"}
        </button>
      </div>
    </div>
  );
}
