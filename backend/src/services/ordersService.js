const ordersRepository = require("../repositories/ordersRepository");
const productsRepository = require("../repositories/productsRepository");
const paymentsRepository = require("../repositories/paymentsRepository");
const paymentGateway = require("./paymentGateway");
const redis = require("../db/redis");
const db = require("../db/postgres");

function moneyToCents(value) {
  return Math.round(Number(value) * 100);
}

function centsToMoney(cents) {
  return (cents / 100).toFixed(2);
}

async function withTransaction(callback) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function createOrder({ customerId, items, totalAmount }) {
  if (!customerId || !Array.isArray(items) || items.length === 0) {
    const error = new Error("customerId and items are required");
    error.status = 400;
    throw error;
  }

  const normalizedItems = new Map();

  for (const rawItem of items) {
    const productId = Number(rawItem?.productId);
    const quantity = Number(rawItem?.quantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      const error = new Error("Each item needs a valid productId");
      error.status = 400;
      throw error;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error("Each item quantity must be a positive integer");
      error.status = 400;
      throw error;
    }

    normalizedItems.set(productId, (normalizedItems.get(productId) || 0) + quantity);
  }

  return withTransaction(async (client) => {
    const productIds = [...normalizedItems.keys()].sort((a, b) => a - b);
    const lockedProducts = [];

    for (const productId of productIds) {
      const product = await productsRepository.getProductByIdForUpdate(productId, client);
      if (!product) {
        const error = new Error(`Product ${productId} not found`);
        error.status = 404;
        throw error;
      }
      lockedProducts.push(product);
    }

    let totalCents = 0;
    const enrichedItems = [];

    for (const product of lockedProducts) {
      const quantity = normalizedItems.get(Number(product.id));
      if (Number(product.stock) < quantity) {
        const error = new Error(`Insufficient stock for ${product.name}`);
        error.status = 409;
        throw error;
      }

      const unitPriceCents = moneyToCents(product.price);
      totalCents += unitPriceCents * quantity;
      enrichedItems.push({
        productId: Number(product.id),
        quantity,
        unitPrice: centsToMoney(unitPriceCents),
      });
    }

    for (const item of enrichedItems) {
      const updatedProduct = await productsRepository.decrementStock(
        item.productId,
        item.quantity,
        client,
      );

      if (!updatedProduct) {
        const error = new Error("Inventory changed while reserving stock");
        error.status = 409;
        throw error;
      }
    }

    return ordersRepository.createOrder(
      {
        customerId,
        totalAmount: centsToMoney(totalCents),
        items: enrichedItems,
      },
      client,
    );
  });
}

async function chargeOrder({ orderId, idempotencyKey }) {
  if (idempotencyKey) {
    const cached = await redis.get(`idem:${idempotencyKey}`);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  return withTransaction(async (client) => {
    if (idempotencyKey) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [idempotencyKey]);
    }

    const existingPayment = idempotencyKey
      ? await paymentsRepository.findPaymentByIdempotencyKey(idempotencyKey, client)
      : null;

    const order = await ordersRepository.getOrderByIdForUpdate(orderId, client);
    if (!order) {
      const error = new Error("Order not found");
      error.status = 404;
      throw error;
    }

    if (existingPayment) {
      if (Number(existingPayment.orderId) !== Number(orderId)) {
        const error = new Error("Idempotency key already used for another order");
        error.status = 409;
        throw error;
      }
      return { order, payment: existingPayment };
    }

    if (order.status !== "PENDING") {
      const error = new Error("Only pending orders can be charged");
      error.status = 409;
      throw error;
    }

    const gatewayResponse = await paymentGateway.charge({
      orderId: order.id,
      amount: order.totalAmount,
    });

    const payment = await paymentsRepository.createPayment(
      {
        orderId: order.id,
        amount: gatewayResponse.chargedAmount,
        providerTxnId: gatewayResponse.providerTxnId,
        status: "SUCCESS",
        idempotencyKey,
      },
      client,
    );

    const updatedOrder = await ordersRepository.markOrderAsPaid(order.id, client);

    if (idempotencyKey) {
      await redis.set(
        `idem:${idempotencyKey}`,
        JSON.stringify({ order: updatedOrder, payment }),
        "EX",
        3600,
      );
    }

    return { order: updatedOrder, payment };
  });
}

async function processPaymentWebhook({
  providerEventId,
  orderId,
  eventType,
  payload,
}) {
  return withTransaction(async (client) => {
    const existingEvent = await paymentsRepository.findWebhookEventByProviderEventId(
      providerEventId,
      client,
    );

    if (existingEvent) {
      return { accepted: true, duplicate: true };
    }

    await paymentsRepository.createWebhookEvent(
      {
        providerEventId,
        orderId,
        eventType,
        payload,
      },
      client,
    );

    const order = await ordersRepository.getOrderByIdForUpdate(orderId, client);
    if (!order) {
      const error = new Error("Order not found");
      error.status = 404;
      throw error;
    }

    if (eventType === "payment_succeeded" && order.status !== "PAID") {
      await ordersRepository.markOrderAsPaid(orderId, client);
    }

    return { accepted: true };
  });
}

async function getOrderById(orderId) {
  const order = await ordersRepository.getOrderWithDetails(orderId);
  if (!order) {
    const error = new Error("Order not found");
    error.status = 404;
    throw error;
  }
  return order;
}

async function listOrders(params) {
  return ordersRepository.listOrders(params);
}

module.exports = {
  createOrder,
  chargeOrder,
  processPaymentWebhook,
  getOrderById,
  listOrders,
};
