const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const morgan = require("morgan");
const { createAuthHelpers } = require("./auth");
const { db } = require("./db");

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parsePositiveInteger(value) {
  const parsed = parseInteger(value);
  if (parsed === null || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseNonNegativeNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function normalizeDateBoundary(rawDate, endOfDay = false) {
  if (!rawDate) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return `${rawDate} ${endOfDay ? "23:59:59" : "00:00:00"}`;
  }

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString().slice(0, 19).replace("T", " ");
}

function isDiscountType(value) {
  return value === "none" || value === "percent" || value === "flat";
}

function aggregateProducts(rows) {
  const groupedProducts = new Map();

  rows.forEach((row) => {
    if (!groupedProducts.has(row.product_id)) {
      groupedProducts.set(row.product_id, {
        id: row.product_id,
        name: row.product_name,
        sku: row.product_sku,
        description: row.product_description,
        price: toMoney(row.product_price),
        stock_quantity: row.product_stock_quantity,
        category_id: row.category_id,
        category_name: row.category_name,
        created_at: row.product_created_at,
        updated_at: row.product_updated_at,
        colors: []
      });
    }

    if (row.color_id !== null) {
      groupedProducts.get(row.product_id).colors.push({
        id: row.color_id,
        name: row.color_name,
        hex_code: row.color_hex_code,
        stock_quantity: row.color_stock_quantity
      });
    }
  });

  return Array.from(groupedProducts.values());
}

function getProductsWithFilters(filters = {}) {
  const whereClauses = [];
  const queryParams = {};

  if (filters.search) {
    whereClauses.push(
      "(p.name LIKE @search OR p.sku LIKE @search OR p.description LIKE @search)"
    );
    queryParams.search = `%${filters.search.trim()}%`;
  }

  if (filters.category) {
    const rawCategory = String(filters.category).trim();
    if (/^\d+$/.test(rawCategory)) {
      whereClauses.push("p.category_id = @categoryId");
      queryParams.categoryId = Number(rawCategory);
    } else {
      whereClauses.push("LOWER(c.name) = LOWER(@categoryName)");
      queryParams.categoryName = rawCategory;
    }
  }

  if (filters.color) {
    const rawColor = String(filters.color).trim();
    const colorFilters = rawColor
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const numericColorFilters = colorFilters.filter((value) => /^\d+$/.test(value));

    if (numericColorFilters.length && numericColorFilters.length === colorFilters.length) {
      const placeholders = numericColorFilters.map(
        (_value, index) => `@colorId${index}`
      );
      whereClauses.push(`co.id IN (${placeholders.join(", ")})`);

      numericColorFilters.forEach((value, index) => {
        queryParams[`colorId${index}`] = Number(value);
      });
    } else {
      whereClauses.push("LOWER(co.name) = LOWER(@colorName)");
      queryParams.colorName = rawColor;
    }
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.sku AS product_sku,
        p.description AS product_description,
        p.price AS product_price,
        p.stock_quantity AS product_stock_quantity,
        p.created_at AS product_created_at,
        p.updated_at AS product_updated_at,
        c.id AS category_id,
        c.name AS category_name,
        co.id AS color_id,
        co.name AS color_name,
        co.hex_code AS color_hex_code,
        pc.stock_quantity AS color_stock_quantity
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_colors pc ON pc.product_id = p.id
      LEFT JOIN colors co ON co.id = pc.color_id
      ${whereSql}
      ORDER BY p.name ASC, co.name ASC
    `
    )
    .all(queryParams);

  return aggregateProducts(rows);
}

function getProductById(productId) {
  const rows = db
    .prepare(
      `
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.sku AS product_sku,
        p.description AS product_description,
        p.price AS product_price,
        p.stock_quantity AS product_stock_quantity,
        p.created_at AS product_created_at,
        p.updated_at AS product_updated_at,
        c.id AS category_id,
        c.name AS category_name,
        co.id AS color_id,
        co.name AS color_name,
        co.hex_code AS color_hex_code,
        pc.stock_quantity AS color_stock_quantity
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_colors pc ON pc.product_id = p.id
      LEFT JOIN colors co ON co.id = pc.color_id
      WHERE p.id = ?
      ORDER BY co.name ASC
    `
    )
    .all(productId);

  if (rows.length === 0) {
    return null;
  }

  return aggregateProducts(rows)[0];
}

function getProductStockRecord(productId) {
  return db
    .prepare("SELECT id, name, price, stock_quantity FROM products WHERE id = ?")
    .get(productId);
}

function getColorStockRecord(productId, colorId) {
  return db
    .prepare(
      `
      SELECT
        pc.product_id,
        pc.color_id,
        pc.stock_quantity,
        c.name,
        c.hex_code
      FROM product_colors pc
      JOIN colors c ON c.id = pc.color_id
      WHERE pc.product_id = ? AND pc.color_id = ?
    `
    )
    .get(productId, colorId);
}

function resolveColorId(productId, maybeColorId) {
  if (maybeColorId === undefined || maybeColorId === null || maybeColorId === "") {
    const firstVariant = db
      .prepare(
        "SELECT color_id FROM product_colors WHERE product_id = ? ORDER BY color_id ASC LIMIT 1"
      )
      .get(productId);

    return firstVariant ? firstVariant.color_id : null;
  }

  const parsedColorId = parseInteger(maybeColorId);
  if (!parsedColorId) {
    throw new Error("Invalid color id.");
  }

  return parsedColorId;
}

function decreaseStock(productId, colorId, quantity) {
  const product = getProductStockRecord(productId);
  if (!product) {
    throw new Error(`Product ${productId} was not found.`);
  }

  if (product.stock_quantity < quantity) {
    throw new Error(`Insufficient stock for ${product.name}.`);
  }

  if (colorId !== null) {
    const colorVariant = getColorStockRecord(productId, colorId);
    if (!colorVariant) {
      throw new Error("Selected color variant is unavailable for this product.");
    }

    if (colorVariant.stock_quantity < quantity) {
      throw new Error(
        `Insufficient stock for ${product.name} (${colorVariant.name}).`
      );
    }

    db.prepare(
      `
      UPDATE product_colors
      SET stock_quantity = stock_quantity - ?, updated_at = datetime('now')
      WHERE product_id = ? AND color_id = ?
    `
    ).run(quantity, productId, colorId);
  }

  db.prepare(
    `
    UPDATE products
    SET stock_quantity = stock_quantity - ?, updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(quantity, productId);
}

function increaseStock(productId, colorId, quantity) {
  const product = getProductStockRecord(productId);
  if (!product) {
    return;
  }

  db.prepare(
    `
    UPDATE products
    SET stock_quantity = stock_quantity + ?, updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(quantity, productId);

  if (colorId !== null) {
    const colorVariant = getColorStockRecord(productId, colorId);
    if (colorVariant) {
      db.prepare(
        `
        UPDATE product_colors
        SET stock_quantity = stock_quantity + ?, updated_at = datetime('now')
        WHERE product_id = ? AND color_id = ?
      `
      ).run(quantity, productId, colorId);
    }
  }
}

function buildSaleTotals({ subtotal, discountType, discountValue, taxEnabled, taxRate }) {
  const normalizedSubtotal = toMoney(subtotal);
  const safeDiscountType = isDiscountType(discountType) ? discountType : "none";
  const safeDiscountValue = parseNonNegativeNumber(discountValue) ?? 0;
  const safeTaxEnabled = Boolean(taxEnabled);
  const safeTaxRate = safeTaxEnabled ? parseNonNegativeNumber(taxRate) ?? 0 : 0;

  let discountAmount = 0;

  if (safeDiscountType === "percent") {
    const cappedPercent = Math.min(safeDiscountValue, 100);
    discountAmount = toMoney((normalizedSubtotal * cappedPercent) / 100);
  }

  if (safeDiscountType === "flat") {
    discountAmount = toMoney(Math.min(safeDiscountValue, normalizedSubtotal));
  }

  const taxableBase = toMoney(Math.max(0, normalizedSubtotal - discountAmount));
  const taxAmount = safeTaxEnabled
    ? toMoney((taxableBase * safeTaxRate) / 100)
    : 0;
  const total = toMoney(taxableBase + taxAmount);

  return {
    subtotal: normalizedSubtotal,
    discount_type: safeDiscountType,
    discount_value: toMoney(safeDiscountValue),
    discount_amount: discountAmount,
    tax_enabled: safeTaxEnabled ? 1 : 0,
    tax_rate: toMoney(safeTaxRate),
    tax_amount: taxAmount,
    total
  };
}

function prepareSaleItemForWrite(item, itemIndex) {
  const productId = parsePositiveInteger(item.product_id);
  if (!productId) {
    throw new Error(`Item ${itemIndex + 1}: invalid product.`);
  }

  const quantity = parsePositiveInteger(item.quantity);
  if (!quantity) {
    throw new Error(`Item ${itemIndex + 1}: quantity must be greater than zero.`);
  }

  const product = getProductStockRecord(productId);
  if (!product) {
    throw new Error(`Item ${itemIndex + 1}: product not found.`);
  }

  const colorId = resolveColorId(productId, item.color_id);

  if (colorId !== null) {
    const colorVariant = getColorStockRecord(productId, colorId);
    if (!colorVariant) {
      throw new Error(`Item ${itemIndex + 1}: color variant not found.`);
    }

    if (colorVariant.stock_quantity < quantity) {
      throw new Error(
        `Item ${itemIndex + 1}: insufficient stock for ${product.name} (${colorVariant.name}).`
      );
    }
  }

  if (product.stock_quantity < quantity) {
    throw new Error(`Item ${itemIndex + 1}: insufficient stock for ${product.name}.`);
  }

  const unitPrice =
    item.unit_price !== undefined
      ? parseNonNegativeNumber(item.unit_price)
      : parseNonNegativeNumber(product.price);

  if (unitPrice === null) {
    throw new Error(`Item ${itemIndex + 1}: unit price is invalid.`);
  }

  return {
    product_id: productId,
    color_id: colorId,
    quantity,
    unit_price: toMoney(unitPrice),
    line_total: toMoney(unitPrice * quantity)
  };
}

function getSaleItemsBySaleIds(saleIds) {
  if (!saleIds.length) {
    return [];
  }

  const placeholders = saleIds.map(() => "?").join(", ");

  return db
    .prepare(
      `
      SELECT
        si.id,
        si.sale_id,
        si.product_id,
        si.color_id,
        si.quantity,
        si.unit_price,
        si.line_total,
        p.name AS product_name,
        p.sku AS product_sku,
        c.name AS color_name,
        c.hex_code AS color_hex_code
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      LEFT JOIN colors c ON c.id = si.color_id
      WHERE si.sale_id IN (${placeholders})
      ORDER BY si.id ASC
    `
    )
    .all(...saleIds);
}

function attachItemsToSales(sales) {
  if (!sales.length) {
    return [];
  }

  const saleIds = sales.map((sale) => sale.id);
  const itemRows = getSaleItemsBySaleIds(saleIds);
  const itemsBySaleId = new Map();

  itemRows.forEach((itemRow) => {
    if (!itemsBySaleId.has(itemRow.sale_id)) {
      itemsBySaleId.set(itemRow.sale_id, []);
    }

    itemsBySaleId.get(itemRow.sale_id).push({
      id: itemRow.id,
      product_id: itemRow.product_id,
      product_name: itemRow.product_name,
      product_sku: itemRow.product_sku,
      color_id: itemRow.color_id,
      color_name: itemRow.color_name,
      color_hex_code: itemRow.color_hex_code,
      quantity: itemRow.quantity,
      unit_price: toMoney(itemRow.unit_price),
      line_total: toMoney(itemRow.line_total)
    });
  });

  return sales.map((sale) => ({
    ...sale,
    subtotal: toMoney(sale.subtotal),
    discount_value: toMoney(sale.discount_value),
    discount_amount: toMoney(sale.discount_amount),
    tax_rate: toMoney(sale.tax_rate),
    tax_amount: toMoney(sale.tax_amount),
    total: toMoney(sale.total),
    tax_enabled: sale.tax_enabled === 1,
    items: itemsBySaleId.get(sale.id) || []
  }));
}

function getSaleById(saleId) {
  const saleRow = db
    .prepare(
      `
      SELECT
        s.*,
        cu.name AS customer_name,
        cu.phone AS customer_phone,
        cu.email AS customer_email
      FROM sales s
      LEFT JOIN customers cu ON cu.id = s.customer_id
      WHERE s.id = ?
    `
    )
    .get(saleId);

  if (!saleRow) {
    return null;
  }

  return attachItemsToSales([saleRow])[0];
}

function recalculateSaleTotals(saleId) {
  const sale = db
    .prepare(
      `
      SELECT id, discount_type, discount_value, tax_enabled, tax_rate
      FROM sales
      WHERE id = ?
    `
    )
    .get(saleId);

  if (!sale) {
    throw new Error("Sale not found.");
  }

  const subtotalRow = db
    .prepare("SELECT COALESCE(SUM(line_total), 0) AS subtotal FROM sale_items WHERE sale_id = ?")
    .get(saleId);

  const totals = buildSaleTotals({
    subtotal: subtotalRow.subtotal,
    discountType: sale.discount_type,
    discountValue: sale.discount_value,
    taxEnabled: sale.tax_enabled === 1,
    taxRate: sale.tax_rate
  });

  db.prepare(
    `
    UPDATE sales
    SET
      subtotal = ?,
      discount_amount = ?,
      tax_amount = ?,
      total = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(totals.subtotal, totals.discount_amount, totals.tax_amount, totals.total, saleId);

  return totals;
}

const createSaleTransaction = db.transaction((payload) => {
  const incomingItems = Array.isArray(payload.items) ? payload.items : [];
  if (!incomingItems.length) {
    throw new Error("A sale must include at least one item.");
  }

  let customerId = null;
  if (payload.customer_id !== undefined && payload.customer_id !== null && payload.customer_id !== "") {
    customerId = parsePositiveInteger(payload.customer_id);
    if (!customerId) {
      throw new Error("Invalid customer id.");
    }

    const customerExists = db
      .prepare("SELECT id FROM customers WHERE id = ?")
      .get(customerId);

    if (!customerExists) {
      throw new Error("Customer not found.");
    }
  }

  const preparedItems = incomingItems.map((item, index) =>
    prepareSaleItemForWrite(item, index)
  );

  const subtotal = preparedItems.reduce((sum, item) => sum + item.line_total, 0);
  const totals = buildSaleTotals({
    subtotal,
    discountType: payload.discount_type,
    discountValue: payload.discount_value,
    taxEnabled: payload.tax_enabled,
    taxRate: payload.tax_rate
  });

  const saleInsertInfo = db
    .prepare(
      `
      INSERT INTO sales (
        customer_id,
        subtotal,
        discount_type,
        discount_value,
        discount_amount,
        tax_enabled,
        tax_rate,
        tax_amount,
        total,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    )
    .run(
      customerId,
      totals.subtotal,
      totals.discount_type,
      totals.discount_value,
      totals.discount_amount,
      totals.tax_enabled,
      totals.tax_rate,
      totals.tax_amount,
      totals.total
    );

  const saleId = Number(saleInsertInfo.lastInsertRowid);
  const insertSaleItem = db.prepare(
    `
    INSERT INTO sale_items (
      sale_id,
      product_id,
      color_id,
      quantity,
      unit_price,
      line_total,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `
  );

  preparedItems.forEach((item) => {
    insertSaleItem.run(
      saleId,
      item.product_id,
      item.color_id,
      item.quantity,
      item.unit_price,
      item.line_total
    );

    decreaseStock(item.product_id, item.color_id, item.quantity);
  });

  return saleId;
});

const deleteSaleTransaction = db.transaction((saleId) => {
  const sale = db.prepare("SELECT id FROM sales WHERE id = ?").get(saleId);
  if (!sale) {
    throw new Error("Sale not found.");
  }

  const saleItems = db
    .prepare("SELECT product_id, color_id, quantity FROM sale_items WHERE sale_id = ?")
    .all(saleId);

  saleItems.forEach((item) => {
    increaseStock(item.product_id, item.color_id, item.quantity);
  });

  db.prepare("DELETE FROM sales WHERE id = ?").run(saleId);
});

const createSaleItemTransaction = db.transaction((payload) => {
  const saleId = parsePositiveInteger(payload.sale_id);
  if (!saleId) {
    throw new Error("sale_id is required.");
  }

  const saleExists = db.prepare("SELECT id FROM sales WHERE id = ?").get(saleId);
  if (!saleExists) {
    throw new Error("Sale not found.");
  }

  const preparedItem = prepareSaleItemForWrite(payload, 0);

  const insertResult = db
    .prepare(
      `
      INSERT INTO sale_items (
        sale_id,
        product_id,
        color_id,
        quantity,
        unit_price,
        line_total,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `
    )
    .run(
      saleId,
      preparedItem.product_id,
      preparedItem.color_id,
      preparedItem.quantity,
      preparedItem.unit_price,
      preparedItem.line_total
    );

  decreaseStock(preparedItem.product_id, preparedItem.color_id, preparedItem.quantity);
  recalculateSaleTotals(saleId);

  return Number(insertResult.lastInsertRowid);
});

const updateSaleItemTransaction = db.transaction((saleItemId, payload) => {
  const existingItem = db
    .prepare(
      `
      SELECT id, sale_id, product_id, color_id, quantity, unit_price
      FROM sale_items
      WHERE id = ?
    `
    )
    .get(saleItemId);

  if (!existingItem) {
    throw new Error("Sale item not found.");
  }

  increaseStock(existingItem.product_id, existingItem.color_id, existingItem.quantity);

  const nextItemPayload = {
    product_id:
      payload.product_id !== undefined ? payload.product_id : existingItem.product_id,
    color_id:
      payload.color_id !== undefined ? payload.color_id : existingItem.color_id,
    quantity: payload.quantity !== undefined ? payload.quantity : existingItem.quantity,
    unit_price:
      payload.unit_price !== undefined ? payload.unit_price : existingItem.unit_price
  };

  const preparedItem = prepareSaleItemForWrite(nextItemPayload, 0);

  db.prepare(
    `
    UPDATE sale_items
    SET
      product_id = ?,
      color_id = ?,
      quantity = ?,
      unit_price = ?,
      line_total = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(
    preparedItem.product_id,
    preparedItem.color_id,
    preparedItem.quantity,
    preparedItem.unit_price,
    preparedItem.line_total,
    saleItemId
  );

  decreaseStock(preparedItem.product_id, preparedItem.color_id, preparedItem.quantity);
  recalculateSaleTotals(existingItem.sale_id);

  return existingItem.sale_id;
});

const deleteSaleItemTransaction = db.transaction((saleItemId) => {
  const existingItem = db
    .prepare("SELECT id, sale_id, product_id, color_id, quantity FROM sale_items WHERE id = ?")
    .get(saleItemId);

  if (!existingItem) {
    throw new Error("Sale item not found.");
  }

  increaseStock(existingItem.product_id, existingItem.color_id, existingItem.quantity);
  db.prepare("DELETE FROM sale_items WHERE id = ?").run(saleItemId);
  recalculateSaleTotals(existingItem.sale_id);

  return existingItem.sale_id;
});

function createApp() {
  const app = express();
  const {
    JWT_EXPIRES_IN,
    sanitizeUser,
    getUserByUsername,
    signAccessToken,
    authenticateRequest,
    authorizeRoles
  } = createAuthHelpers(db);
  const managerOnly = authorizeRoles("manager");

  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  app.use((req, _res, next) => {
    if (req.url.startsWith("/api/sale_items")) {
      req.url = req.url.replace("/api/sale_items", "/api/sale-items");
    }
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const username =
      typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required." });
    }

    const user = getUserByUsername(username);

    if (!user || user.is_active !== 1) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const safeUser = sanitizeUser(user);
    const token = signAccessToken(safeUser);

    return res.json({
      token,
      token_type: "Bearer",
      expires_in: JWT_EXPIRES_IN,
      user: safeUser
    });
  });

  app.get("/api/auth/me", authenticateRequest, (req, res) => {
    return res.json({ user: req.user });
  });

  app.post("/api/auth/logout", authenticateRequest, (_req, res) => {
    return res.status(204).send();
  });

  app.use("/api", authenticateRequest);

  app.get("/api/categories", (_req, res) => {
    const categories = db
      .prepare("SELECT id, name, created_at FROM categories ORDER BY name ASC")
      .all();

    res.json(categories);
  });

  app.get("/api/categories/:id", (req, res) => {
    const categoryId = parsePositiveInteger(req.params.id);
    if (!categoryId) {
      return res.status(400).json({ error: "Invalid category id." });
    }

    const category = db
      .prepare("SELECT id, name, created_at FROM categories WHERE id = ?")
      .get(categoryId);

    if (!category) {
      return res.status(404).json({ error: "Category not found." });
    }

    return res.json(category);
  });

  app.post("/api/categories", managerOnly, (req, res, next) => {
    try {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";

      if (!name) {
        return res.status(400).json({ error: "Category name is required." });
      }

      const insertResult = db
        .prepare("INSERT INTO categories (name) VALUES (?)")
        .run(name);

      const createdCategory = db
        .prepare("SELECT id, name, created_at FROM categories WHERE id = ?")
        .get(Number(insertResult.lastInsertRowid));

      return res.status(201).json(createdCategory);
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/categories/:id", managerOnly, (req, res, next) => {
    try {
      const categoryId = parsePositiveInteger(req.params.id);
      if (!categoryId) {
        return res.status(400).json({ error: "Invalid category id." });
      }

      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
      if (!name) {
        return res.status(400).json({ error: "Category name is required." });
      }

      const updateResult = db
        .prepare("UPDATE categories SET name = ? WHERE id = ?")
        .run(name, categoryId);

      if (updateResult.changes === 0) {
        return res.status(404).json({ error: "Category not found." });
      }

      const updatedCategory = db
        .prepare("SELECT id, name, created_at FROM categories WHERE id = ?")
        .get(categoryId);

      return res.json(updatedCategory);
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/categories/:id", managerOnly, (req, res, next) => {
    try {
      const categoryId = parsePositiveInteger(req.params.id);
      if (!categoryId) {
        return res.status(400).json({ error: "Invalid category id." });
      }

      const deleteResult = db
        .prepare("DELETE FROM categories WHERE id = ?")
        .run(categoryId);

      if (deleteResult.changes === 0) {
        return res.status(404).json({ error: "Category not found." });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/colors", (_req, res) => {
    const colors = db
      .prepare("SELECT id, name, hex_code, created_at FROM colors ORDER BY id ASC")
      .all();

    res.json(colors);
  });

  app.get("/api/colors/:id", (req, res) => {
    const colorId = parsePositiveInteger(req.params.id);
    if (!colorId) {
      return res.status(400).json({ error: "Invalid color id." });
    }

    const color = db
      .prepare("SELECT id, name, hex_code, created_at FROM colors WHERE id = ?")
      .get(colorId);

    if (!color) {
      return res.status(404).json({ error: "Color not found." });
    }

    return res.json(color);
  });

  app.post("/api/colors", managerOnly, (req, res, next) => {
    try {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
      const hexCode =
        typeof req.body.hex_code === "string" ? req.body.hex_code.trim() : "";

      if (!name || !hexCode) {
        return res
          .status(400)
          .json({ error: "Color name and hex_code are required." });
      }

      if (!/^#([0-9A-Fa-f]{6})$/.test(hexCode)) {
        return res.status(400).json({ error: "hex_code must be a valid HEX color." });
      }

      const insertResult = db
        .prepare("INSERT INTO colors (name, hex_code) VALUES (?, ?)")
        .run(name, hexCode.toUpperCase());

      const createdColor = db
        .prepare("SELECT id, name, hex_code, created_at FROM colors WHERE id = ?")
        .get(Number(insertResult.lastInsertRowid));

      return res.status(201).json(createdColor);
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/colors/:id", managerOnly, (req, res, next) => {
    try {
      const colorId = parsePositiveInteger(req.params.id);
      if (!colorId) {
        return res.status(400).json({ error: "Invalid color id." });
      }

      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
      const hexCode =
        typeof req.body.hex_code === "string" ? req.body.hex_code.trim() : "";

      if (!name || !hexCode) {
        return res
          .status(400)
          .json({ error: "Color name and hex_code are required." });
      }

      if (!/^#([0-9A-Fa-f]{6})$/.test(hexCode)) {
        return res.status(400).json({ error: "hex_code must be a valid HEX color." });
      }

      const updateResult = db
        .prepare("UPDATE colors SET name = ?, hex_code = ? WHERE id = ?")
        .run(name, hexCode.toUpperCase(), colorId);

      if (updateResult.changes === 0) {
        return res.status(404).json({ error: "Color not found." });
      }

      const updatedColor = db
        .prepare("SELECT id, name, hex_code, created_at FROM colors WHERE id = ?")
        .get(colorId);

      return res.json(updatedColor);
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/colors/:id", managerOnly, (req, res, next) => {
    try {
      const colorId = parsePositiveInteger(req.params.id);
      if (!colorId) {
        return res.status(400).json({ error: "Invalid color id." });
      }

      const deleteResult = db.prepare("DELETE FROM colors WHERE id = ?").run(colorId);

      if (deleteResult.changes === 0) {
        return res.status(404).json({ error: "Color not found." });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/products", (req, res, next) => {
    try {
      const products = getProductsWithFilters({
        category: req.query.category,
        color: req.query.color,
        search: req.query.search
      });

      return res.json(products);
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/products/:id", (req, res, next) => {
    try {
      const productId = parsePositiveInteger(req.params.id);
      if (!productId) {
        return res.status(400).json({ error: "Invalid product id." });
      }

      const product = getProductById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found." });
      }

      return res.json(product);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/products", managerOnly, (req, res, next) => {
    const transaction = db.transaction((body) => {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const description =
        typeof body.description === "string" ? body.description.trim() : "";
      const categoryId = parsePositiveInteger(body.category_id);
      const price = parseNonNegativeNumber(body.price);

      if (!name || !categoryId || price === null) {
        throw new Error("name, category_id, and price are required.");
      }

      const categoryExists = db
        .prepare("SELECT id FROM categories WHERE id = ?")
        .get(categoryId);

      if (!categoryExists) {
        throw new Error("Category not found.");
      }

      const rawColorItems = Array.isArray(body.colors) ? body.colors : [];
      const validatedColorItems = [];

      rawColorItems.forEach((colorItem) => {
        const colorId = parsePositiveInteger(colorItem.color_id);
        const colorStock = parseInteger(colorItem.stock_quantity);

        if (!colorId || colorStock === null || colorStock < 0) {
          throw new Error("Each color must include color_id and non-negative stock_quantity.");
        }

        const colorExists = db
          .prepare("SELECT id FROM colors WHERE id = ?")
          .get(colorId);

        if (!colorExists) {
          throw new Error(`Color ${colorId} does not exist.`);
        }

        validatedColorItems.push({
          color_id: colorId,
          stock_quantity: colorStock
        });
      });

      const uniqueColorItems = [];
      const seenColorIds = new Set();
      validatedColorItems.forEach((colorItem) => {
        if (!seenColorIds.has(colorItem.color_id)) {
          seenColorIds.add(colorItem.color_id);
          uniqueColorItems.push(colorItem);
        }
      });

      let computedStockFromColors = uniqueColorItems.reduce(
        (sum, colorItem) => sum + colorItem.stock_quantity,
        0
      );

      let stockQuantity = parseInteger(body.stock_quantity);
      if (stockQuantity === null || stockQuantity < 0) {
        stockQuantity = computedStockFromColors;
      }

      if (uniqueColorItems.length === 0) {
        const allColors = db.prepare("SELECT id FROM colors ORDER BY id ASC").all();
        if (allColors.length) {
          const base = Math.floor(stockQuantity / allColors.length);
          const remainder = stockQuantity % allColors.length;

          allColors.forEach((colorRow, index) => {
            uniqueColorItems.push({
              color_id: colorRow.id,
              stock_quantity: base + (index < remainder ? 1 : 0)
            });
          });

          computedStockFromColors = uniqueColorItems.reduce(
            (sum, colorItem) => sum + colorItem.stock_quantity,
            0
          );
          stockQuantity = Math.max(stockQuantity, computedStockFromColors);
        }
      } else {
        stockQuantity = Math.max(stockQuantity, computedStockFromColors);
      }

      const sku =
        typeof body.sku === "string" && body.sku.trim()
          ? body.sku.trim().toUpperCase()
          : `CLTH-${Date.now().toString().slice(-8)}`;

      const productInsertResult = db
        .prepare(
          `
          INSERT INTO products (
            name,
            sku,
            category_id,
            description,
            price,
            stock_quantity,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `
        )
        .run(name, sku, categoryId, description, toMoney(price), stockQuantity);

      const productId = Number(productInsertResult.lastInsertRowid);

      const insertVariant = db.prepare(
        `
        INSERT INTO product_colors (
          product_id,
          color_id,
          stock_quantity,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `
      );

      uniqueColorItems.forEach((colorItem) => {
        insertVariant.run(productId, colorItem.color_id, colorItem.stock_quantity);
      });

      return productId;
    });

    try {
      const productId = transaction(req.body);
      const createdProduct = getProductById(productId);
      return res.status(201).json(createdProduct);
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/products/:id", managerOnly, (req, res, next) => {
    const transaction = db.transaction((productId, body) => {
      const existingProduct = db
        .prepare("SELECT id FROM products WHERE id = ?")
        .get(productId);

      if (!existingProduct) {
        throw new Error("Product not found.");
      }

      const updates = [];
      const params = { id: productId };

      if (body.name !== undefined) {
        if (typeof body.name !== "string" || !body.name.trim()) {
          throw new Error("name must be a non-empty string.");
        }
        updates.push("name = @name");
        params.name = body.name.trim();
      }

      if (body.sku !== undefined) {
        if (typeof body.sku !== "string" || !body.sku.trim()) {
          throw new Error("sku must be a non-empty string.");
        }
        updates.push("sku = @sku");
        params.sku = body.sku.trim().toUpperCase();
      }

      if (body.description !== undefined) {
        if (typeof body.description !== "string") {
          throw new Error("description must be a string.");
        }
        updates.push("description = @description");
        params.description = body.description.trim();
      }

      if (body.category_id !== undefined) {
        const categoryId = parsePositiveInteger(body.category_id);
        if (!categoryId) {
          throw new Error("category_id must be a positive integer.");
        }

        const categoryExists = db
          .prepare("SELECT id FROM categories WHERE id = ?")
          .get(categoryId);

        if (!categoryExists) {
          throw new Error("Category not found.");
        }

        updates.push("category_id = @categoryId");
        params.categoryId = categoryId;
      }

      if (body.price !== undefined) {
        const price = parseNonNegativeNumber(body.price);
        if (price === null) {
          throw new Error("price must be a non-negative number.");
        }
        updates.push("price = @price");
        params.price = toMoney(price);
      }

      if (body.stock_quantity !== undefined) {
        const stockQuantity = parseInteger(body.stock_quantity);
        if (stockQuantity === null || stockQuantity < 0) {
          throw new Error("stock_quantity must be a non-negative integer.");
        }
        updates.push("stock_quantity = @stockQuantity");
        params.stockQuantity = stockQuantity;
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");

        db.prepare(
          `
          UPDATE products
          SET ${updates.join(", ")}
          WHERE id = @id
        `
        ).run(params);
      }

      if (body.colors !== undefined) {
        if (!Array.isArray(body.colors)) {
          throw new Error("colors must be an array.");
        }

        const seenColorIds = new Set();
        const validatedColors = body.colors.map((colorItem) => {
          const colorId = parsePositiveInteger(colorItem.color_id);
          const colorStock = parseInteger(colorItem.stock_quantity);

          if (!colorId || colorStock === null || colorStock < 0) {
            throw new Error(
              "Each color variant must include color_id and non-negative stock_quantity."
            );
          }

          if (seenColorIds.has(colorId)) {
            throw new Error("Duplicate color_id values are not allowed.");
          }

          seenColorIds.add(colorId);

          const colorExists = db
            .prepare("SELECT id FROM colors WHERE id = ?")
            .get(colorId);

          if (!colorExists) {
            throw new Error(`Color ${colorId} does not exist.`);
          }

          return {
            color_id: colorId,
            stock_quantity: colorStock
          };
        });

        db.prepare("DELETE FROM product_colors WHERE product_id = ?").run(productId);

        const insertVariant = db.prepare(
          `
          INSERT INTO product_colors (
            product_id,
            color_id,
            stock_quantity,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `
        );

        validatedColors.forEach((colorItem) => {
          insertVariant.run(productId, colorItem.color_id, colorItem.stock_quantity);
        });

        if (body.stock_quantity === undefined) {
          const colorStockTotal = validatedColors.reduce(
            (sum, colorItem) => sum + colorItem.stock_quantity,
            0
          );

          db.prepare(
            `
            UPDATE products
            SET stock_quantity = ?, updated_at = datetime('now')
            WHERE id = ?
          `
          ).run(colorStockTotal, productId);
        }
      }

      return productId;
    });

    try {
      const productId = parsePositiveInteger(req.params.id);
      if (!productId) {
        return res.status(400).json({ error: "Invalid product id." });
      }

      const updatedProductId = transaction(productId, req.body);
      const updatedProduct = getProductById(updatedProductId);

      return res.json(updatedProduct);
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/products/:id", managerOnly, (req, res, next) => {
    try {
      const productId = parsePositiveInteger(req.params.id);
      if (!productId) {
        return res.status(400).json({ error: "Invalid product id." });
      }

      const deleteResult = db.prepare("DELETE FROM products WHERE id = ?").run(productId);

      if (deleteResult.changes === 0) {
        return res.status(404).json({ error: "Product not found." });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/customers", (_req, res) => {
    const customers = db
      .prepare(
        `
        SELECT
          cu.id,
          cu.name,
          cu.phone,
          cu.email,
          cu.created_at,
          cu.updated_at,
          COUNT(s.id) AS purchase_count,
          COALESCE(SUM(s.total), 0) AS total_spent,
          MAX(s.created_at) AS last_purchase_at
        FROM customers cu
        LEFT JOIN sales s ON s.customer_id = cu.id
        GROUP BY cu.id
        ORDER BY cu.name ASC
      `
      )
      .all()
      .map((customer) => ({
        ...customer,
        total_spent: toMoney(customer.total_spent)
      }));

    res.json(customers);
  });

  app.get("/api/customers/:id", (req, res) => {
    const customerId = parsePositiveInteger(req.params.id);
    if (!customerId) {
      return res.status(400).json({ error: "Invalid customer id." });
    }

    const customer = db
      .prepare(
        `
        SELECT
          cu.id,
          cu.name,
          cu.phone,
          cu.email,
          cu.created_at,
          cu.updated_at,
          COUNT(s.id) AS purchase_count,
          COALESCE(SUM(s.total), 0) AS total_spent,
          MAX(s.created_at) AS last_purchase_at
        FROM customers cu
        LEFT JOIN sales s ON s.customer_id = cu.id
        WHERE cu.id = ?
        GROUP BY cu.id
      `
      )
      .get(customerId);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    return res.json({
      ...customer,
      total_spent: toMoney(customer.total_spent)
    });
  });

  app.post("/api/customers", (req, res, next) => {
    try {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
      const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
      const email = typeof req.body.email === "string" ? req.body.email.trim() : "";

      if (!name || !phone || !email) {
        return res
          .status(400)
          .json({ error: "name, phone, and email are required." });
      }

      const insertResult = db
        .prepare(
          `
          INSERT INTO customers (name, phone, email, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `
        )
        .run(name, phone, email);

      const createdCustomer = db
        .prepare("SELECT id, name, phone, email, created_at, updated_at FROM customers WHERE id = ?")
        .get(Number(insertResult.lastInsertRowid));

      return res.status(201).json(createdCustomer);
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/customers/:id", managerOnly, (req, res, next) => {
    try {
      const customerId = parsePositiveInteger(req.params.id);
      if (!customerId) {
        return res.status(400).json({ error: "Invalid customer id." });
      }

      const updates = [];
      const params = { id: customerId };

      if (req.body.name !== undefined) {
        if (typeof req.body.name !== "string" || !req.body.name.trim()) {
          return res.status(400).json({ error: "name must be a non-empty string." });
        }
        updates.push("name = @name");
        params.name = req.body.name.trim();
      }

      if (req.body.phone !== undefined) {
        if (typeof req.body.phone !== "string" || !req.body.phone.trim()) {
          return res.status(400).json({ error: "phone must be a non-empty string." });
        }
        updates.push("phone = @phone");
        params.phone = req.body.phone.trim();
      }

      if (req.body.email !== undefined) {
        if (typeof req.body.email !== "string" || !req.body.email.trim()) {
          return res.status(400).json({ error: "email must be a non-empty string." });
        }
        updates.push("email = @email");
        params.email = req.body.email.trim();
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields were provided for update." });
      }

      updates.push("updated_at = datetime('now')");

      const updateResult = db.prepare(
        `
        UPDATE customers
        SET ${updates.join(", ")}
        WHERE id = @id
      `
      ).run(params);

      if (updateResult.changes === 0) {
        return res.status(404).json({ error: "Customer not found." });
      }

      const updatedCustomer = db
        .prepare("SELECT id, name, phone, email, created_at, updated_at FROM customers WHERE id = ?")
        .get(customerId);

      return res.json(updatedCustomer);
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/customers/:id", managerOnly, (req, res, next) => {
    try {
      const customerId = parsePositiveInteger(req.params.id);
      if (!customerId) {
        return res.status(400).json({ error: "Invalid customer id." });
      }

      const deleteResult = db
        .prepare("DELETE FROM customers WHERE id = ?")
        .run(customerId);

      if (deleteResult.changes === 0) {
        return res.status(404).json({ error: "Customer not found." });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/sales", (req, res, next) => {
    try {
      const saleId = createSaleTransaction(req.body || {});
      const sale = getSaleById(saleId);

      return res.status(201).json(sale);
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/sales", (req, res, next) => {
    try {
      const page = Math.max(parsePositiveInteger(req.query.page) || 1, 1);
      const pageSize = Math.min(
        Math.max(parsePositiveInteger(req.query.pageSize) || 20, 1),
        100
      );
      const offset = (page - 1) * pageSize;

      const startDate = req.query.startDate
        ? normalizeDateBoundary(req.query.startDate, false)
        : null;
      const endDate = req.query.endDate
        ? normalizeDateBoundary(req.query.endDate, true)
        : null;

      if ((req.query.startDate && !startDate) || (req.query.endDate && !endDate)) {
        return res
          .status(400)
          .json({ error: "Invalid date filters. Use YYYY-MM-DD or ISO date format." });
      }

      const whereClauses = [];
      const queryParams = {};

      if (startDate) {
        whereClauses.push("s.created_at >= @startDate");
        queryParams.startDate = startDate;
      }

      if (endDate) {
        whereClauses.push("s.created_at <= @endDate");
        queryParams.endDate = endDate;
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

      const totalCount = db
        .prepare(`SELECT COUNT(*) AS count FROM sales s ${whereSql}`)
        .get(queryParams).count;

      const salesRows = db
        .prepare(
          `
          SELECT
            s.*,
            cu.name AS customer_name,
            cu.phone AS customer_phone,
            cu.email AS customer_email
          FROM sales s
          LEFT JOIN customers cu ON cu.id = s.customer_id
          ${whereSql}
          ORDER BY s.created_at DESC
          LIMIT @limit OFFSET @offset
        `
        )
        .all({
          ...queryParams,
          limit: pageSize,
          offset
        });

      const sales = attachItemsToSales(salesRows);

      return res.json({
        data: sales,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages: Math.max(Math.ceil(totalCount / pageSize), 1)
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/sales/:id", (req, res, next) => {
    try {
      const saleId = parsePositiveInteger(req.params.id);
      if (!saleId) {
        return res.status(400).json({ error: "Invalid sale id." });
      }

      const sale = getSaleById(saleId);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found." });
      }

      return res.json(sale);
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/sales/:id", managerOnly, (req, res, next) => {
    const transaction = db.transaction((saleId, body) => {
      const existingSale = db.prepare("SELECT id FROM sales WHERE id = ?").get(saleId);
      if (!existingSale) {
        throw new Error("Sale not found.");
      }

      const updates = [];
      const params = { id: saleId };

      if (body.customer_id !== undefined) {
        if (body.customer_id === null || body.customer_id === "") {
          updates.push("customer_id = NULL");
        } else {
          const customerId = parsePositiveInteger(body.customer_id);
          if (!customerId) {
            throw new Error("customer_id must be a positive integer or null.");
          }

          const customerExists = db
            .prepare("SELECT id FROM customers WHERE id = ?")
            .get(customerId);

          if (!customerExists) {
            throw new Error("Customer not found.");
          }

          updates.push("customer_id = @customerId");
          params.customerId = customerId;
        }
      }

      if (body.discount_type !== undefined) {
        if (!isDiscountType(body.discount_type)) {
          throw new Error("discount_type must be one of: none, percent, flat.");
        }
        updates.push("discount_type = @discountType");
        params.discountType = body.discount_type;
      }

      if (body.discount_value !== undefined) {
        const discountValue = parseNonNegativeNumber(body.discount_value);
        if (discountValue === null) {
          throw new Error("discount_value must be a non-negative number.");
        }
        updates.push("discount_value = @discountValue");
        params.discountValue = toMoney(discountValue);
      }

      if (body.tax_enabled !== undefined) {
        updates.push("tax_enabled = @taxEnabled");
        params.taxEnabled = body.tax_enabled ? 1 : 0;
      }

      if (body.tax_rate !== undefined) {
        const taxRate = parseNonNegativeNumber(body.tax_rate);
        if (taxRate === null) {
          throw new Error("tax_rate must be a non-negative number.");
        }
        updates.push("tax_rate = @taxRate");
        params.taxRate = toMoney(taxRate);
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");

        db.prepare(
          `
          UPDATE sales
          SET ${updates.join(", ")}
          WHERE id = @id
        `
        ).run(params);
      }

      recalculateSaleTotals(saleId);

      return saleId;
    });

    try {
      const saleId = parsePositiveInteger(req.params.id);
      if (!saleId) {
        return res.status(400).json({ error: "Invalid sale id." });
      }

      const updatedSaleId = transaction(saleId, req.body || {});
      const sale = getSaleById(updatedSaleId);
      return res.json(sale);
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/sales/:id", managerOnly, (req, res, next) => {
    try {
      const saleId = parsePositiveInteger(req.params.id);
      if (!saleId) {
        return res.status(400).json({ error: "Invalid sale id." });
      }

      deleteSaleTransaction(saleId);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/sale-items", managerOnly, (req, res, next) => {
    try {
      const saleId = req.query.sale_id ? parsePositiveInteger(req.query.sale_id) : null;
      if (req.query.sale_id && !saleId) {
        return res.status(400).json({ error: "sale_id must be a positive integer." });
      }

      const query = `
        SELECT
          si.id,
          si.sale_id,
          si.product_id,
          si.color_id,
          si.quantity,
          si.unit_price,
          si.line_total,
          si.created_at,
          si.updated_at,
          p.name AS product_name,
          p.sku AS product_sku,
          c.name AS color_name,
          c.hex_code AS color_hex_code
        FROM sale_items si
        JOIN products p ON p.id = si.product_id
        LEFT JOIN colors c ON c.id = si.color_id
        ${saleId ? "WHERE si.sale_id = @saleId" : ""}
        ORDER BY si.created_at DESC
      `;

      const rows = db
        .prepare(query)
        .all(saleId ? { saleId } : {})
        .map((item) => ({
          ...item,
          unit_price: toMoney(item.unit_price),
          line_total: toMoney(item.line_total)
        }));

      return res.json(rows);
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/sale-items/:id", managerOnly, (req, res, next) => {
    try {
      const saleItemId = parsePositiveInteger(req.params.id);
      if (!saleItemId) {
        return res.status(400).json({ error: "Invalid sale item id." });
      }

      const saleItem = db
        .prepare(
          `
          SELECT
            si.id,
            si.sale_id,
            si.product_id,
            si.color_id,
            si.quantity,
            si.unit_price,
            si.line_total,
            si.created_at,
            si.updated_at,
            p.name AS product_name,
            p.sku AS product_sku,
            c.name AS color_name,
            c.hex_code AS color_hex_code
          FROM sale_items si
          JOIN products p ON p.id = si.product_id
          LEFT JOIN colors c ON c.id = si.color_id
          WHERE si.id = ?
        `
        )
        .get(saleItemId);

      if (!saleItem) {
        return res.status(404).json({ error: "Sale item not found." });
      }

      return res.json({
        ...saleItem,
        unit_price: toMoney(saleItem.unit_price),
        line_total: toMoney(saleItem.line_total)
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/sale-items", managerOnly, (req, res, next) => {
    try {
      const saleItemId = createSaleItemTransaction(req.body || {});
      const createdItem = db
        .prepare(
          `
          SELECT
            si.id,
            si.sale_id,
            si.product_id,
            si.color_id,
            si.quantity,
            si.unit_price,
            si.line_total,
            p.name AS product_name,
            p.sku AS product_sku,
            c.name AS color_name,
            c.hex_code AS color_hex_code
          FROM sale_items si
          JOIN products p ON p.id = si.product_id
          LEFT JOIN colors c ON c.id = si.color_id
          WHERE si.id = ?
        `
        )
        .get(saleItemId);

      return res.status(201).json({
        ...createdItem,
        unit_price: toMoney(createdItem.unit_price),
        line_total: toMoney(createdItem.line_total)
      });
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/sale-items/:id", managerOnly, (req, res, next) => {
    try {
      const saleItemId = parsePositiveInteger(req.params.id);
      if (!saleItemId) {
        return res.status(400).json({ error: "Invalid sale item id." });
      }

      const saleId = updateSaleItemTransaction(saleItemId, req.body || {});
      const sale = getSaleById(saleId);

      return res.json(sale);
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/sale-items/:id", managerOnly, (req, res, next) => {
    try {
      const saleItemId = parsePositiveInteger(req.params.id);
      if (!saleItemId) {
        return res.status(400).json({ error: "Invalid sale item id." });
      }

      const saleId = deleteSaleItemTransaction(saleItemId);
      const sale = getSaleById(saleId);

      return res.json(sale);
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/dashboard", managerOnly, (_req, res, next) => {
    try {
      const todayRevenue = toMoney(
        db
          .prepare(
            "SELECT COALESCE(SUM(total), 0) AS revenue FROM sales WHERE date(created_at) = date('now', 'localtime')"
          )
          .get().revenue
      );

      const weeklyRevenue = toMoney(
        db
          .prepare(
            "SELECT COALESCE(SUM(total), 0) AS revenue FROM sales WHERE date(created_at) >= date('now', 'localtime', '-6 days')"
          )
          .get().revenue
      );

      const previousWeekRevenue = toMoney(
        db
          .prepare(
            "SELECT COALESCE(SUM(total), 0) AS revenue FROM sales WHERE date(created_at) >= date('now', 'localtime', '-13 days') AND date(created_at) <= date('now', 'localtime', '-7 days')"
          )
          .get().revenue
      );

      const weeklyDelta = toMoney(weeklyRevenue - previousWeekRevenue);
      const weeklyTrendPercent =
        previousWeekRevenue > 0
          ? toMoney((Math.abs(weeklyDelta) / previousWeekRevenue) * 100)
          : weeklyRevenue > 0
            ? 100
            : 0;

      const monthlyRevenue = toMoney(
        db
          .prepare(
            "SELECT COALESCE(SUM(total), 0) AS revenue FROM sales WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')"
          )
          .get().revenue
      );

      const totalTransactions = db
        .prepare("SELECT COUNT(*) AS total FROM sales")
        .get().total;

      const salesLast7Days = db
        .prepare(
          `
          WITH RECURSIVE days(day) AS (
            SELECT date('now', 'localtime', '-6 days')
            UNION ALL
            SELECT date(day, '+1 day')
            FROM days
            WHERE day < date('now', 'localtime')
          )
          SELECT
            days.day AS date,
            COALESCE(SUM(s.total), 0) AS revenue,
            COUNT(s.id) AS transactions
          FROM days
          LEFT JOIN sales s ON date(s.created_at) = days.day
          GROUP BY days.day
          ORDER BY days.day ASC
        `
        )
        .all()
        .map((day) => ({
          date: day.date,
          revenue: toMoney(day.revenue),
          transactions: day.transactions
        }));

      const revenueByCategory = db
        .prepare(
          `
          SELECT
            c.id,
            c.name,
            COALESCE(SUM(si.line_total), 0) AS revenue
          FROM categories c
          LEFT JOIN products p ON p.category_id = c.id
          LEFT JOIN sale_items si ON si.product_id = p.id
          GROUP BY c.id
          ORDER BY revenue DESC, c.name ASC
        `
        )
        .all()
        .map((category) => ({
          ...category,
          revenue: toMoney(category.revenue)
        }));

      const topProducts = db
        .prepare(
          `
          SELECT
            p.id,
            p.name,
            COALESCE(SUM(si.quantity), 0) AS quantity_sold,
            COALESCE(SUM(si.line_total), 0) AS revenue
          FROM products p
          LEFT JOIN sale_items si ON si.product_id = p.id
          GROUP BY p.id
          ORDER BY quantity_sold DESC, revenue DESC
          LIMIT 5
        `
        )
        .all()
        .map((product) => ({
          ...product,
          revenue: toMoney(product.revenue)
        }));

      const lowStockAlerts = db
        .prepare(
          `
          SELECT
            p.id,
            p.name,
            p.stock_quantity,
            p.price,
            c.name AS category_name
          FROM products p
          JOIN categories c ON c.id = p.category_id
          WHERE p.stock_quantity < 5
          ORDER BY p.stock_quantity ASC, p.name ASC
          LIMIT 20
        `
        )
        .all()
        .map((product) => ({
          ...product,
          price: toMoney(product.price)
        }));

      const recentTransactions = db
        .prepare(
          `
          SELECT
            s.id,
            s.created_at,
            s.total,
            s.subtotal,
            s.discount_amount,
            s.tax_amount,
            cu.name AS customer_name
          FROM sales s
          LEFT JOIN customers cu ON cu.id = s.customer_id
          ORDER BY s.created_at DESC
          LIMIT 10
        `
        )
        .all()
        .map((sale) => ({
          ...sale,
          total: toMoney(sale.total),
          subtotal: toMoney(sale.subtotal),
          discount_amount: toMoney(sale.discount_amount),
          tax_amount: toMoney(sale.tax_amount)
        }));

      return res.json({
        kpis: {
          today_revenue: todayRevenue,
          weekly_revenue: weeklyRevenue,
          previous_week_revenue: previousWeekRevenue,
          weekly_trend: {
            direction: weeklyDelta >= 0 ? "up" : "down",
            delta: weeklyDelta,
            percent: weeklyTrendPercent
          },
          monthly_revenue: monthlyRevenue,
          total_transactions: totalTransactions
        },
        sales_last_7_days: salesLast7Days,
        revenue_by_category: revenueByCategory,
        top_products: topProducts,
        low_stock_alerts: lowStockAlerts,
        recent_transactions: recentTransactions
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
  });

  app.use((error, _req, res, _next) => {
    const message = String(error?.message || "");
    const normalizedMessage = message.toLowerCase();

    if (
      error &&
      (error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
        error.code === "SQLITE_CONSTRAINT_PRIMARYKEY")
    ) {
      return res.status(409).json({ error: "A unique value already exists." });
    }

    if (error && error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return res.status(409).json({ error: "Operation violates related records." });
    }

    if (normalizedMessage.includes("not found")) {
      return res.status(404).json({ error: message });
    }

    if (
      normalizedMessage.includes("required") ||
      normalizedMessage.includes("invalid") ||
      normalizedMessage.includes("must be") ||
      normalizedMessage.includes("no fields")
    ) {
      return res.status(400).json({ error: message });
    }

    if (normalizedMessage.includes("insufficient stock")) {
      return res.status(400).json({ error: message });
    }

    console.error(error);
    return res.status(500).json({ error: "Internal server error." });
  });

  return app;
}

module.exports = {
  createApp
};
