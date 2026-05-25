import { useEffect, useState } from "react";
import { createProductAdmin, listOrdersAdmin, listProducts, updateProductAdmin } from "../api";
import type { Order, Product } from "../types";

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Record<number, Partial<Product>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    sku: "",
    name: "",
    description: "",
    price: "",
    stock: "",
  });

  useEffect(() => {
    let active = true;

    Promise.all([listOrdersAdmin(), listProducts()])
      .then(([nextOrders, nextProducts]) => {
        if (!active) {
          return;
        }

        setOrders(nextOrders);
        setProducts(nextProducts);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load admin data");
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
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  function onChangeField(id: number, field: keyof Product, value: string) {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function save(p: Product) {
    const draft = editing[p.id] || {};
    setSavingProductId(p.id);
    setError(null);

    try {
      const updated = await updateProductAdmin(p.id, {
        price: draft.price !== undefined ? Number(draft.price) : undefined,
        stock: draft.stock !== undefined ? Number(draft.stock) : undefined,
        description: draft.description as string | undefined,
        name: draft.name as string | undefined,
      });

      setProducts((current) =>
        current.map((it) => (it.id === updated.id ? updated : it)),
      );
      setEditing((current) => {
        const next = { ...current };
        delete next[p.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSavingProductId(null);
    }
  }

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (creating) return;
    setCreating(true);
    setError(null);

    const sku = newProduct.sku.trim();
    const name = newProduct.name.trim();
    const description = newProduct.description.trim() || null;
    const price = Number(newProduct.price);
    const stock = Number(newProduct.stock);

    if (!sku || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
      setError("sku, name, price, stock are required");
      setCreating(false);
      return;
    }

    if (name.length < 2) {
      setError("name must be at least 2 characters");
      setCreating(false);
      return;
    }

    try {
      const created = await createProductAdmin({
        sku,
        name,
        description,
        price,
        stock,
      });

      setProducts((current) => [...current, created]);
      setNewProduct({ sku: "", name: "", description: "", price: "", stock: "" });
      setToast(`Created product ${created.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="page"><h1>Admin</h1><p>Loading...</p></div>;
  }

  return (
    <div className="page">
      <h1>Admin</h1>
      {toast && <div className="toast" role="status">{toast}</div>}
      {error && <p className="error">{error}</p>}

      <section>
        <h2>Create Product</h2>
        <form className="admin-create-form" onSubmit={createProduct}>
          <input
            type="text"
            placeholder="SKU"
            value={newProduct.sku}
            required
            onChange={(e) => setNewProduct((current) => ({ ...current, sku: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Name"
            value={newProduct.name}
            required
            minLength={2}
            onChange={(e) => setNewProduct((current) => ({ ...current, name: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Price"
            value={newProduct.price}
            required
            min="0"
            step="0.01"
            onChange={(e) => setNewProduct((current) => ({ ...current, price: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Stock"
            value={newProduct.stock}
            required
            min="0"
            step="1"
            onChange={(e) => setNewProduct((current) => ({ ...current, stock: e.target.value }))}
          />
          <textarea
            placeholder="Description"
            value={newProduct.description}
            onChange={(e) => setNewProduct((current) => ({ ...current, description: e.target.value }))}
          />
          <button className="primary" type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create product"}
          </button>
        </form>
      </section>

      <section>
        <h2>Orders</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.customerId}</td>
                <td>${o.totalAmount}</td>
                <td>{o.status}</td>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Products</h2>
        <ul className="admin-products">
          {products.map((p) => {
            const draft = editing[p.id] || {};

            return (
            <li key={p.id} className="admin-product">
              <input
                type="text"
                value={draft.name ?? p.name}
                onChange={(e) => onChangeField(p.id, "name", e.target.value)}
              />
              <input
                type="text"
                value={draft.price ?? p.price}
                onChange={(e) => onChangeField(p.id, "price", e.target.value)}
              />
              <input
                type="text"
                value={draft.stock ?? String(p.stock)}
                onChange={(e) => onChangeField(p.id, "stock", e.target.value)}
              />
              <textarea
                value={draft.description ?? p.description}
                onChange={(e) =>
                  onChangeField(p.id, "description", e.target.value)
                }
              />
              <button onClick={() => save(p)} disabled={savingProductId === p.id}>
                {savingProductId === p.id ? "Saving..." : "Save"}
              </button>
            </li>
          );
          })}
        </ul>
      </section>
    </div>
  );
}
