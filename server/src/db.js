const path = require("path");
const Database = require("better-sqlite3");
const { seedDatabase } = require("./seed");

const dbFilePath = path.join(__dirname, "..", "cloth-pos.db");
const db = new Database(dbFilePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      hex_code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      category_id INTEGER NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL CHECK (price >= 0),
      stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS product_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      color_id INTEGER NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (product_id, color_id),
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
      FOREIGN KEY (color_id) REFERENCES colors (id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_type TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none', 'percent', 'flat')),
      discount_value REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_enabled INTEGER NOT NULL DEFAULT 0 CHECK (tax_enabled IN (0, 1)),
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      color_id INTEGER,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price REAL NOT NULL CHECK (unit_price >= 0),
      line_total REAL NOT NULL CHECK (line_total >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
      FOREIGN KEY (color_id) REFERENCES colors (id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
    CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products (stock_quantity);
    CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON product_colors (product_id);
    CREATE INDEX IF NOT EXISTS idx_product_colors_color_id ON product_colors (color_id);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales (customer_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items (product_id);
  `);

  const seedCheck = db.prepare("SELECT COUNT(*) AS count FROM categories").get();

  if (seedCheck.count === 0) {
    seedDatabase(db);
  }
}

module.exports = {
  db,
  initializeDatabase
};
