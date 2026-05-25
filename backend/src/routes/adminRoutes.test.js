jest.mock("../db/postgres", () => ({
  connect: jest.fn(),
}));

jest.mock("../db/redis", () => ({
  get: jest.fn(),
  set: jest.fn(),
  on: jest.fn(),
}));

jest.mock("../repositories/ordersRepository", () => ({
  createOrder: jest.fn(),
  getOrderByIdForUpdate: jest.fn(),
  markOrderAsPaid: jest.fn(),
  listOrders: jest.fn(),
  getOrderWithDetails: jest.fn(),
}));

jest.mock("../repositories/productsRepository", () => ({
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  listProducts: jest.fn(),
  getProductById: jest.fn(),
  getProductByIdForUpdate: jest.fn(),
  decrementStock: jest.fn(),
}));

jest.mock("../repositories/paymentsRepository", () => ({
  createPayment: jest.fn(),
  findPaymentByIdempotencyKey: jest.fn(),
  createWebhookEvent: jest.fn(),
  findWebhookEventByProviderEventId: jest.fn(),
}));

jest.mock("../services/paymentGateway", () => ({
  charge: jest.fn(),
}));

const request = require("supertest");

describe("admin routes", () => {
  let app;
  let productsRepository;

  beforeEach(() => {
    jest.resetModules();
    process.env.ADMIN_TOKEN = "admin-secret";
    app = require("../app");
    productsRepository = require("../repositories/productsRepository");
  });

  it("returns a validation error when creating a product without a body", async () => {
    const response = await request(app)
      .post("/admin/products")
      .set("Authorization", "Bearer admin-secret")
      .expect(400);

    expect(response.body).toEqual({
      error: "sku, name, price, stock are required",
    });
    expect(productsRepository.createProduct).not.toHaveBeenCalled();
  });
});