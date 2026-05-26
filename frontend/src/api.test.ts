import { beforeEach, describe, expect, it, vi } from "vitest";

describe("admin API auth token", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    vi.stubEnv("VITE_ADMIN_TOKEN", "admin-secret");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    }) as typeof fetch;
  });

  it("uses the configured env token", async () => {
    const { createProductAdmin } = await import("./api");

    await createProductAdmin({
      sku: "SKU-1",
      name: "Item",
      description: "",
      price: 1,
      stock: 1,
    });

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = new Headers(options?.headers);
    expect(url).toBe("http://localhost:3000/admin/products");
    expect(headers.get("Authorization")).toBe("Bearer admin-secret");
    expect(headers.get("Content-Type")).toBe("application/json");
  });
});