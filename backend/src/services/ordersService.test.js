jest.mock("../db/postgres", () => ({
  connect: jest.fn(),
}));

jest.mock("../db/redis", () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock("./paymentGateway", () => ({
  charge: jest.fn(),
}));

jest.mock("../repositories/ordersRepository", () => ({
  createOrder: jest.fn(),
  getOrderByIdForUpdate: jest.fn(),
  markOrderAsPaid: jest.fn(),
  listOrders: jest.fn(),
  getOrderWithDetails: jest.fn(),
}));

jest.mock("../repositories/productsRepository", () => ({
  getProductByIdForUpdate: jest.fn(),
  decrementStock: jest.fn(),
}));

jest.mock("../repositories/paymentsRepository", () => ({
  createPayment: jest.fn(),
  findPaymentByIdempotencyKey: jest.fn(),
  createWebhookEvent: jest.fn(),
  findWebhookEventByProviderEventId: jest.fn(),
}));

const db = require("../db/postgres");
const redis = require("../db/redis");
const paymentGateway = require("./paymentGateway");
const ordersRepository = require("../repositories/ordersRepository");
const productsRepository = require("../repositories/productsRepository");
const paymentsRepository = require("../repositories/paymentsRepository");
const ordersService = require("./ordersService");

function makeClient() {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
}

describe("ordersService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("computes order totals on the server and reserves stock inside a transaction", async () => {
    const client = makeClient();
    db.connect.mockResolvedValue(client);

    productsRepository.getProductByIdForUpdate
      .mockResolvedValueOnce({ id: 1, price: "12.34", stock: 5, name: "Item A" })
      .mockResolvedValueOnce({ id: 2, price: "5.00", stock: 3, name: "Item B" });

    productsRepository.decrementStock.mockResolvedValue({ id: 1, stock: 3 });
    ordersRepository.createOrder.mockResolvedValue({
      id: 10,
      customerId: "customer_001",
      totalAmount: "29.68",
      status: "PENDING",
    });

    const order = await ordersService.createOrder({
      customerId: "customer_001",
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
      totalAmount: 1,
    });

    expect(order.totalAmount).toBe("29.68");
    expect(ordersRepository.createOrder).toHaveBeenCalledWith(
      {
        customerId: "customer_001",
        totalAmount: "29.68",
        items: [
          { productId: 1, quantity: 2, unitPrice: "12.34" },
          { productId: 2, quantity: 1, unitPrice: "5.00" },
        ],
      },
      client,
    );
    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(productsRepository.decrementStock).toHaveBeenCalledTimes(2);
  });

  it("returns the stored payment for a reused idempotency key without charging again", async () => {
    const client = makeClient();
    db.connect.mockResolvedValue(client);

    redis.get.mockResolvedValue(null);
    paymentsRepository.findPaymentByIdempotencyKey.mockResolvedValue({
      id: 99,
      orderId: 10,
      amount: "29.68",
      providerTxnId: "txn_existing",
      status: "SUCCESS",
      createdAt: new Date().toISOString(),
    });
    ordersRepository.getOrderByIdForUpdate.mockResolvedValue({
      id: 10,
      status: "PAID",
      totalAmount: "29.68",
    });

    const result = await ordersService.chargeOrder({
      orderId: 10,
      idempotencyKey: "idem-123",
    });

    expect(result.payment.providerTxnId).toBe("txn_existing");
    expect(paymentGateway.charge).not.toHaveBeenCalled();
    expect(paymentsRepository.createPayment).not.toHaveBeenCalled();
    expect(ordersRepository.markOrderAsPaid).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      ["idem-123"],
    );
  });

  it("deduplicates duplicate webhook events", async () => {
    const client = makeClient();
    db.connect.mockResolvedValue(client);

    paymentsRepository.findWebhookEventByProviderEventId.mockResolvedValue({
      id: 7,
      providerEventId: "evt-1",
      orderId: 10,
      eventType: "payment_succeeded",
    });

    const result = await ordersService.processPaymentWebhook({
      providerEventId: "evt-1",
      orderId: 10,
      eventType: "payment_succeeded",
      payload: {},
    });

    expect(result).toEqual({ accepted: true, duplicate: true });
    expect(paymentsRepository.createWebhookEvent).not.toHaveBeenCalled();
    expect(ordersRepository.markOrderAsPaid).not.toHaveBeenCalled();
  });
});