import type { Order, Product } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function getAdminToken() {
  const envToken = import.meta.env.VITE_ADMIN_TOKEN?.trim() ?? "";
  return envToken;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || res.statusText);
  }
  return data as T;
}

export function listProducts(q?: string): Promise<Product[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return request<Product[]>(`/products${qs}`);
}

export function getProduct(id: number | string): Promise<Product> {
  return request<Product>(`/products/${id}`);
}

export function createOrder(body: {
  customerId: string;
  items: { productId: number; quantity: number }[];
  totalAmount: number;
}): Promise<Order> {
  return request<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getOrder(id: number | string): Promise<Order> {
  return request<Order>(`/orders/${id}`);
}

export function chargeOrder(orderId: number): Promise<{ order: Order }> {
  return request<{ order: Order }>(`/payments/charge`, {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

export function listOrdersAdmin(): Promise<Order[]> {
  return request<Order[]>(`/orders`, {
    headers: {
      Authorization: `Bearer ${getAdminToken()}`,
    },
  });
}

export function createProductAdmin(body: {
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
}): Promise<Product> {
  return request<Product>(`/admin/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAdminToken()}`,
    },
    body: JSON.stringify(body),
  });
}

export function updateProductAdmin(
  id: number,
  body: { price?: number; stock?: number; description?: string; name?: string },
): Promise<Product> {
  return request<Product>(`/admin/products/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getAdminToken()}`,
    },
    body: JSON.stringify(body),
  });
}
