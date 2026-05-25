const ordersService = require("./ordersService");

jest.mock("../db/redis", () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock("../repositories/paymentsRepository", () => ({
  createPayment: jest.fn(),
  findPaymentByIdempotencyKey: jest.fn(),
  findWebhookEventByProviderEventId: jest.fn(),
  createWebhookEvent: jest.fn(),
}));

jest.mock("../repositories/ordersRepository", () => ({
  getOrderById: jest.fn(),
  getOrderByIdForUpdate: jest.fn(),
  markOrderAsPaid: jest.fn(),
  createOrder: jest.fn(),
}));

jest.mock("../repositories/productsRepository", () => ({
  getProductByIdForUpdate: jest.fn(),
  decrementStock: jest.fn(),
}));

jest.mock("./paymentGateway", () => ({
  charge: jest.fn(),
}));

jest.mock("../db/postgres", () => ({
  connect: jest.fn(async () => ({
    query: jest.fn(async () => ({ rows: [], rowCount: 0 })),
    release: jest.fn(),
  })),
}));

const redis = require("../db/redis");
const paymentsRepository = require("../repositories/paymentsRepository");
const ordersRepository = require("../repositories/ordersRepository");
const paymentGateway = require("./paymentGateway");

describe("ordersService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns cached idempotent result when Redis has data", async () => {
    const cached = { order: { id: 1, status: "PAID" }, payment: { id: 2 } };
    redis.get.mockResolvedValueOnce(JSON.stringify(cached));

    const res = await ordersService.chargeOrder({ orderId: 1, idempotencyKey: "idem-123" });

    expect(redis.get).toHaveBeenCalledWith("idem:idem-123");
    expect(res).toEqual(cached);
    expect(paymentGateway.charge).not.toHaveBeenCalled();
    expect(paymentsRepository.createPayment).not.toHaveBeenCalled();
  });

  it("reuses existing payment when idempotency key already persisted", async () => {
    redis.get.mockResolvedValueOnce(null);
    const existingPayment = { id: 5, orderId: 42 };
    paymentsRepository.findPaymentByIdempotencyKey.mockResolvedValueOnce(existingPayment);

    // mock order lookup
    ordersRepository.getOrderByIdForUpdate.mockResolvedValueOnce({ id: 42, status: "PENDING" });

    const res = await ordersService.chargeOrder({ orderId: 42, idempotencyKey: "key-42" });

    expect(paymentsRepository.findPaymentByIdempotencyKey).toHaveBeenCalledWith("key-42", expect.any(Object));
    expect(paymentGateway.charge).not.toHaveBeenCalled();
    expect(res.payment).toEqual(existingPayment);
  });

  it("ignores duplicate webhook events and does not create a new event", async () => {
    paymentsRepository.findWebhookEventByProviderEventId.mockResolvedValueOnce({ id: 99 });

    const res = await ordersService.processPaymentWebhook({ providerEventId: "evt-1", orderId: 10, eventType: "payment_succeeded", payload: {} });

    expect(paymentsRepository.findWebhookEventByProviderEventId).toHaveBeenCalledWith("evt-1", expect.any(Object));
    expect(paymentsRepository.createWebhookEvent).not.toHaveBeenCalled();
    expect(res).toEqual({ accepted: true, duplicate: true });
  });
});
