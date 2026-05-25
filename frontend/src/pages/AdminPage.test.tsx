import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const listOrdersAdmin = vi.fn();
const listProducts = vi.fn();
const createProductAdmin = vi.fn();
const updateProductAdmin = vi.fn();

vi.mock("../api", () => ({
  listOrdersAdmin: (...args: unknown[]) => listOrdersAdmin(...args),
  listProducts: (...args: unknown[]) => listProducts(...args),
  createProductAdmin: (...args: unknown[]) => createProductAdmin(...args),
  updateProductAdmin: (...args: unknown[]) => updateProductAdmin(...args),
}));

import AdminPage from "./AdminPage";

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listOrdersAdmin.mockResolvedValue([]);
    listProducts.mockResolvedValue([]);
    createProductAdmin.mockResolvedValue({
      id: 1,
      sku: "SKU-123",
      name: "Desk Lamp",
      description: "Warm light",
      price: "19.99",
      stock: 4,
      createdAt: "",
      updatedAt: "",
    });
    updateProductAdmin.mockResolvedValue(null);
  });

  it("submits the create-product payload with sku, name, price, stock", async () => {
    render(<AdminPage />);

    await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("SKU"), {
      target: { value: "SKU-123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Desk Lamp" },
    });
    fireEvent.change(screen.getByPlaceholderText("Price"), {
      target: { value: "19.99" },
    });
    fireEvent.change(screen.getByPlaceholderText("Stock"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByPlaceholderText("Description"), {
      target: { value: "Warm light" },
    });

    fireEvent.submit(screen.getByText("Create product").closest("form")!);

    await waitFor(() => {
      expect(createProductAdmin).toHaveBeenCalledWith({
        sku: "SKU-123",
        name: "Desk Lamp",
        description: "Warm light",
        price: 19.99,
        stock: 4,
      });
    });
  });

  it("shows a validation error when name is too short", async () => {
    render(<AdminPage />);

    await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("SKU"), {
      target: { value: "SKU-123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByPlaceholderText("Price"), {
      target: { value: "19.99" },
    });
    fireEvent.change(screen.getByPlaceholderText("Stock"), {
      target: { value: "4" },
    });

    fireEvent.submit(screen.getByText("Create product").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("name must be at least 2 characters")).toBeInTheDocument();
    });
    expect(createProductAdmin).not.toHaveBeenCalled();
  });

  it("treats an empty description as null and validates stock as an integer", async () => {
    render(<AdminPage />);

    await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("SKU"), {
      target: { value: "SKU-123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Desk Lamp" },
    });
    fireEvent.change(screen.getByPlaceholderText("Price"), {
      target: { value: "19.99" },
    });
    fireEvent.change(screen.getByPlaceholderText("Stock"), {
      target: { value: "4" },
    });

    fireEvent.submit(screen.getByText("Create product").closest("form")!);

    await waitFor(() => {
      expect(createProductAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          stock: 4,
          price: 19.99,
        }),
      );
    });
  });

  it("shows a success toast after creating a product", async () => {
    render(<AdminPage />);

    await waitFor(() => expect(screen.getByText("Create Product")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("SKU"), {
      target: { value: "SKU-999" },
    });
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Desk Lamp" },
    });
    fireEvent.change(screen.getByPlaceholderText("Price"), {
      target: { value: "19.99" },
    });
    fireEvent.change(screen.getByPlaceholderText("Stock"), {
      target: { value: "4" },
    });

    fireEvent.submit(screen.getByText("Create product").closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Created product Desk Lamp");
    });
  });
});