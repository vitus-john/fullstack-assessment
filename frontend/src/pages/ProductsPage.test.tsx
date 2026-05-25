import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProductsPage from "./ProductsPage";

const mockProducts = [
  {
    id: 1,
    sku: "SKU-001",
    name: "Wireless Headphones",
    description: "Comfortable audio gear",
    price: "129.99",
    stock: 12,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    sku: "SKU-002",
    name: "Mechanical Keyboard",
    description: "Tactile typing",
    price: "89.50",
    stock: 5,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

vi.mock("../api", () => ({
  listProducts: vi.fn(async (q?: string) => {
    if (!q) {
      return mockProducts;
    }

    const normalized = q.toLowerCase();
    return mockProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized),
    );
  }),
}));

describe("ProductsPage", () => {
  it("restores the full product list when search is cleared", async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(await screen.findByText("Wireless Headphones")).toBeInTheDocument();
    expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search products"), {
      target: { value: "wire" },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
      expect(screen.queryByText("Mechanical Keyboard")).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Search products"), {
      target: { value: "" },
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    await waitFor(() => {
      expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
      expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();
    });
  });
});