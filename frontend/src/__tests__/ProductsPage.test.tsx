import React from "react";
import { vi, describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const allProducts = [
  {
    id: 1,
    sku: "SKU-001",
    name: "Wireless Headphones",
    description: "",
    price: "129.99",
    stock: 12,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 2,
    sku: "SKU-010",
    name: "USB Cable",
    description: "",
    price: "9.99",
    stock: 5,
    createdAt: "",
    updatedAt: "",
  },
];

vi.mock("../api", () => ({
  listProducts: vi.fn((q?: string) => {
    if (!q) return Promise.resolve(allProducts);
    const pattern = q.toLowerCase();
    return Promise.resolve(allProducts.filter((p) => p.name.toLowerCase().includes(pattern)));
  }),
}));

import ProductsPage from "../pages/ProductsPage";
import { MemoryRouter } from "react-router-dom";

describe("ProductsPage search", () => {
  it("shows filtered results and resets to full list when cleared", async () => {
    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>,
    );

    // initial load shows full list
    await waitFor(() => expect(screen.getByText("Wireless Headphones")).toBeInTheDocument());
    expect(screen.getByText("USB Cable")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("Search products");

    // type filter
    fireEvent.change(input, { target: { value: "wire" } });

    await waitFor(() => expect(screen.getByText("Wireless Headphones")).toBeInTheDocument());

    // clear via Escape key which the component listens for
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => expect(screen.getByText("USB Cable")).toBeInTheDocument());
  });
});
