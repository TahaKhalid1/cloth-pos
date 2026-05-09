const CATEGORY_NAMES = [
  "Shirts",
  "Pants",
  "Dresses",
  "Jackets",
  "Accessories",
  "Footwear"
];

const COLOR_PALETTE = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#F5F5F0" },
  { name: "Navy", hex: "#1D3557" },
  { name: "Red", hex: "#B22222" },
  { name: "Emerald", hex: "#0F7B5F" },
  { name: "Beige", hex: "#D6C5A4" },
  { name: "Burgundy", hex: "#6D213C" },
  { name: "Slate", hex: "#4A5568" }
];

const PRODUCT_CATALOG = [
  {
    name: "Oxford Linen Shirt",
    category: "Shirts",
    price: 79.0,
    description: "Breathable linen weave with a tailored urban fit."
  },
  {
    name: "Tailored Poplin Shirt",
    category: "Shirts",
    price: 85.0,
    description: "Crisp poplin shirt suited for premium smart-casual styling."
  },
  {
    name: "Cuban Collar Resort Shirt",
    category: "Shirts",
    price: 72.5,
    description: "Relaxed silhouette with fluid drape for weekend wear."
  },
  {
    name: "Heritage Denim Shirt",
    category: "Shirts",
    price: 88.0,
    description: "Mid-weight denim shirt with reinforced pearl snaps."
  },
  {
    name: "Slim Chino Pants",
    category: "Pants",
    price: 92.0,
    description: "Refined slim-cut chinos with stretch comfort."
  },
  {
    name: "Pleated Wool Trousers",
    category: "Pants",
    price: 124.0,
    description: "Double-pleat wool trousers for a polished evening profile."
  },
  {
    name: "Stretch Jogger Pants",
    category: "Pants",
    price: 68.0,
    description: "Premium knit joggers with tapered leg and cuffed hem."
  },
  {
    name: "High-Rise Wide-Leg Pants",
    category: "Pants",
    price: 109.0,
    description: "Flowing high-rise trousers with soft movement and structure."
  },
  {
    name: "Satin Wrap Dress",
    category: "Dresses",
    price: 132.0,
    description: "Bias-cut satin wrap dress with waist-defining tie."
  },
  {
    name: "Floral Midi Dress",
    category: "Dresses",
    price: 118.0,
    description: "Soft floral print midi with flattering gathered waist."
  },
  {
    name: "Ribbed Knit Dress",
    category: "Dresses",
    price: 96.0,
    description: "Contour rib knit dress designed for all-day elegance."
  },
  {
    name: "Evening Slip Dress",
    category: "Dresses",
    price: 146.0,
    description: "Minimal evening slip with subtle sheen and clean lines."
  },
  {
    name: "Quilted Bomber Jacket",
    category: "Jackets",
    price: 168.0,
    description: "Insulated bomber with quilted body and tonal trims."
  },
  {
    name: "Wool Blend Overcoat",
    category: "Jackets",
    price: 249.0,
    description: "Structured wool overcoat with premium satin lining."
  },
  {
    name: "Cropped Leather Jacket",
    category: "Jackets",
    price: 279.0,
    description: "Supple leather jacket with cropped silhouette and metal zip."
  },
  {
    name: "Utility Field Jacket",
    category: "Jackets",
    price: 189.0,
    description: "Functional field jacket with multi-pocket front and cinch hem."
  },
  {
    name: "Braided Leather Belt",
    category: "Accessories",
    price: 54.0,
    description: "Hand-braided belt crafted from full-grain leather."
  },
  {
    name: "Silk Pocket Square",
    category: "Accessories",
    price: 36.0,
    description: "Pure silk pocket square with rolled-edge finish."
  },
  {
    name: "Minimalist Tote Bag",
    category: "Accessories",
    price: 149.0,
    description: "Structured tote with magnetic closure and inner organizer."
  },
  {
    name: "Cashmere Scarf",
    category: "Accessories",
    price: 92.0,
    description: "Soft brushed cashmere scarf in a timeless long cut."
  },
  {
    name: "Chelsea Leather Boots",
    category: "Footwear",
    price: 214.0,
    description: "Elastic side-panel boots with stacked leather heel."
  },
  {
    name: "Canvas Low-Top Sneakers",
    category: "Footwear",
    price: 84.0,
    description: "Clean low-top sneakers with cushioned insole comfort."
  },
  {
    name: "Suede Loafers",
    category: "Footwear",
    price: 139.0,
    description: "Soft suede loafers with hand-stitched apron seam."
  },
  {
    name: "Heeled Ankle Boots",
    category: "Footwear",
    price: 198.0,
    description: "Sharp ankle boots with sculpted heel and almond toe."
  }
];

const SAMPLE_CUSTOMERS = [
  {
    name: "Amelia Quinn",
    phone: "+1-555-0101",
    email: "amelia.quinn@example.com"
  },
  {
    name: "Noah Bennett",
    phone: "+1-555-0102",
    email: "noah.bennett@example.com"
  },
  {
    name: "Sophia Patel",
    phone: "+1-555-0103",
    email: "sophia.patel@example.com"
  },
  {
    name: "Ethan Clarke",
    phone: "+1-555-0104",
    email: "ethan.clarke@example.com"
  },
  {
    name: "Layla Morgan",
    phone: "+1-555-0105",
    email: "layla.morgan@example.com"
  }
];

function seedDatabase(db) {
  const insertCategory = db.prepare("INSERT INTO categories (name) VALUES (?)");
  const insertColor = db.prepare("INSERT INTO colors (name, hex_code) VALUES (?, ?)");
  const insertProduct = db.prepare(`
    INSERT INTO products (name, sku, category_id, description, price, stock_quantity)
    VALUES (@name, @sku, @categoryId, @description, @price, @stock)
  `);
  const insertProductColor = db.prepare(`
    INSERT INTO product_colors (product_id, color_id, stock_quantity)
    VALUES (?, ?, ?)
  `);
  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, phone, email)
    VALUES (?, ?, ?)
  `);

  const seedTransaction = db.transaction(() => {
    CATEGORY_NAMES.forEach((categoryName) => {
      insertCategory.run(categoryName);
    });

    COLOR_PALETTE.forEach((color) => {
      insertColor.run(color.name, color.hex);
    });

    const categoryRows = db.prepare("SELECT id, name FROM categories").all();
    const colorRows = db.prepare("SELECT id FROM colors ORDER BY id ASC").all();

    const categoryIdByName = new Map(
      categoryRows.map((category) => [category.name, category.id])
    );
    const colorIds = colorRows.map((color) => color.id);

    PRODUCT_CATALOG.forEach((product, productIndex) => {
      const variantStocks = colorIds.map(
        (_, colorIndex) => 4 + ((productIndex * 5 + colorIndex * 3) % 13)
      );
      const totalStock = variantStocks.reduce(
        (stockSum, variantQty) => stockSum + variantQty,
        0
      );
      const sku = `CLTH-${String(productIndex + 1).padStart(4, "0")}`;

      const productInsertInfo = insertProduct.run({
        name: product.name,
        sku,
        categoryId: categoryIdByName.get(product.category),
        description: product.description,
        price: product.price,
        stock: totalStock
      });

      const productId = Number(productInsertInfo.lastInsertRowid);

      colorIds.forEach((colorId, colorIndex) => {
        insertProductColor.run(productId, colorId, variantStocks[colorIndex]);
      });
    });

    SAMPLE_CUSTOMERS.forEach((customer) => {
      insertCustomer.run(customer.name, customer.phone, customer.email);
    });
  });

  seedTransaction();
}

module.exports = {
  seedDatabase
};
