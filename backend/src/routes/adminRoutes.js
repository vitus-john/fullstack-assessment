const express = require("express");
const productsRepository = require("../repositories/productsRepository");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.use(requireAdmin);

router.post("/products", async (req, res, next) => {
  try {
    const { sku, name, description, price, stock } = req.body || {};
    const normalizedSku = typeof sku === "string" ? sku.trim() : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedDescription =
      description == null ? null : typeof description === "string" ? description.trim() : "";
    const normalizedPrice = Number(price);
    const normalizedStock = Number(stock);

    if (
      !normalizedSku ||
      normalizedName.length < 2 ||
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice < 0 ||
      !Number.isInteger(normalizedStock) ||
      normalizedStock < 0
    ) {
      return res
        .status(400)
        .json({ error: "sku, name, price, stock are required" });
    }
    const product = await productsRepository.createProduct({
      sku: normalizedSku,
      name: normalizedName,
      description: normalizedDescription,
      price: normalizedPrice,
      stock: normalizedStock,
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.patch("/products/:id", async (req, res, next) => {
  try {
    const { price, stock, description, name } = req.body || {};
    const normalizedDescription =
      description == null ? undefined : typeof description === "string" ? description.trim() : description;
    const normalizedName = name == null ? undefined : typeof name === "string" ? name.trim() : name;
    const normalizedPrice = price == null ? undefined : Number(price);
    const normalizedStock = stock == null ? undefined : Number(stock);

    const product = await productsRepository.updateProduct(req.params.id, {
      price: normalizedPrice,
      stock: normalizedStock,
      description: normalizedDescription,
      name: normalizedName,
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
