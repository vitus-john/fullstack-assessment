import { beforeEach, describe, expect, it, vi } from "vitest";

describe("admin API auth token", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    vi.stubEnv("VITE_ADMIN_TOKEN", "admin-secret");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    }) as typeof fetch;
  });

  it("prefers the configured env token over localStorage", async () => {
    localStorage.setItem("admin_token", "stale-token");

    const { createProductAdmin } = await import("./api");

    await createProductAdmin({
      sku: "SKU-1",
      name: "Item",
      description: "",
      price: 1,
      stock: 1,
    });

    const [url, options] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe("http://localhost:3000/admin/products");
    expect(options?.headers instanceof Headers).toBe(true);
    expect(options?.headers.get("Authorization")).toBe("Bearer admin-secret");
    expect(options?.headers.get("Content-Type")).toBe("application/json");
  });
});