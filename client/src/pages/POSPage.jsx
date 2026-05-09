import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";
import CartItem from "../components/CartItem";
import ProductCard from "../components/ProductCard";
import ReceiptModal from "../components/ReceiptModal";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import LoadingState from "../components/ui/LoadingState";
import Select from "../components/ui/Select";
import {
  createCustomer,
  createSale,
  getCategories,
  getColors,
  getCustomers,
  getProducts
} from "../api/posApi";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { formatCurrency } from "../utils/format";

const DEFAULT_TAX_RATE = 8;

function calculateTotals(cart, discountType, discountValue, taxEnabled, taxRate) {
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
    0
  );

  const normalizedSubtotal = Number(subtotal.toFixed(2));
  let discountAmount = 0;

  if (discountType === "percent") {
    discountAmount = Number(
      ((normalizedSubtotal * Math.min(Number(discountValue || 0), 100)) / 100).toFixed(2)
    );
  }

  if (discountType === "flat") {
    discountAmount = Number(
      Math.min(Number(discountValue || 0), normalizedSubtotal).toFixed(2)
    );
  }

  const taxable = Number(Math.max(0, normalizedSubtotal - discountAmount).toFixed(2));
  const taxAmount = taxEnabled
    ? Number(((taxable * Number(taxRate || 0)) / 100).toFixed(2))
    : 0;
  const total = Number((taxable + taxAmount).toFixed(2));

  return {
    subtotal: normalizedSubtotal,
    discountAmount,
    taxAmount,
    total
  };
}

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loadingReference, setLoadingReference] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeColor, setActiveColor] = useState("all");

  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);

  const [creatingSale, setCreatingSale] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);
  const [highlightProductId, setHighlightProductId] = useState(null);

  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: ""
  });

  const debouncedSearch = useDebouncedValue(search, 300);

  const totals = useMemo(
    () => calculateTotals(cart, discountType, discountValue, taxEnabled, taxRate),
    [cart, discountType, discountValue, taxEnabled, taxRate]
  );

  const loadReferenceData = useCallback(async () => {
    setLoadingReference(true);

    try {
      const [categoryData, colorData, customerData] = await Promise.all([
        getCategories(),
        getColors(),
        getCustomers()
      ]);

      setCategories(categoryData);
      setColors(colorData);
      setCustomers(customerData);
    } catch (error) {
      toast.error(error.message || "Failed to load reference data.");
    } finally {
      setLoadingReference(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError("");

    try {
      const filters = {};
      if (activeCategory !== "all") {
        filters.category = activeCategory;
      }
      if (activeColor !== "all") {
        filters.color = activeColor;
      }
      if (debouncedSearch.trim()) {
        filters.search = debouncedSearch.trim();
      }

      const productData = await getProducts(filters);
      setProducts(productData);
    } catch (error) {
      setProductsError(error.message || "Failed to load products.");
    } finally {
      setLoadingProducts(false);
    }
  }, [activeCategory, activeColor, debouncedSearch]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function findVariantForProduct(product) {
    if (activeColor !== "all") {
      const matchedVariant = product.colors.find(
        (color) => String(color.id) === String(activeColor)
      );
      if (matchedVariant) {
        return matchedVariant;
      }
    }

    return product.colors[0] || null;
  }

  function getStockCap(product, variant) {
    if (!variant) {
      return product.stock_quantity;
    }

    return Math.min(product.stock_quantity, variant.stock_quantity);
  }

  function addProductToCart(product) {
    const variant = findVariantForProduct(product);
    const stockCap = getStockCap(product, variant);

    if (stockCap <= 0) {
      toast.error("This item is out of stock.");
      return;
    }

    const colorId = variant ? variant.id : null;
    const key = `${product.id}-${colorId ?? "none"}`;

    let reachedLimit = false;

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.key === key);

      if (existingItem) {
        if (existingItem.quantity >= stockCap) {
          reachedLimit = true;
          return currentCart;
        }

        return currentCart.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...currentCart,
        {
          key,
          product_id: product.id,
          color_id: colorId,
          name: product.name,
          color_name: variant ? variant.name : "Standard",
          color_hex_code: variant ? variant.hex_code : null,
          unit_price: Number(product.price),
          quantity: 1,
          stock_cap: stockCap
        }
      ];
    });

    if (reachedLimit) {
      toast.error("Maximum available stock reached for this item.");
      return;
    }

    setHighlightProductId(product.id);
    window.setTimeout(() => setHighlightProductId(null), 260);
  }

  function increaseQuantity(itemKey) {
    let hitLimit = false;

    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.key !== itemKey) {
          return item;
        }

        if (item.quantity >= item.stock_cap) {
          hitLimit = true;
          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1
        };
      })
    );

    if (hitLimit) {
      toast.error("Cannot exceed available stock.");
    }
  }

  function decreaseQuantity(itemKey) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.key === itemKey ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeLineItem(itemKey) {
    setCart((currentCart) => currentCart.filter((item) => item.key !== itemKey));
  }

  async function handleQuickAddCustomer() {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim() || !newCustomer.email.trim()) {
      toast.error("Enter name, phone, and email.");
      return;
    }

    try {
      const created = await createCustomer({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim()
      });

      const refreshedCustomers = await getCustomers();
      setCustomers(refreshedCustomers);
      setSelectedCustomerId(String(created.id));
      setNewCustomer({ name: "", phone: "", email: "" });
      setShowQuickAddCustomer(false);
      toast.success("Customer added.");
    } catch (error) {
      toast.error(error.message || "Unable to add customer.");
    }
  }

  async function handleCompleteSale() {
    if (!cart.length) {
      toast.error("Add products to the cart before checkout.");
      return;
    }

    setCreatingSale(true);

    try {
      const salePayload = {
        customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          color_id: item.color_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        discount_type: discountType,
        discount_value: Number(discountValue || 0),
        tax_enabled: taxEnabled,
        tax_rate: taxEnabled ? Number(taxRate || 0) : 0
      };

      const createdSale = await createSale(salePayload);
      setReceiptSale(createdSale);
      setCart([]);
      setDiscountType("none");
      setDiscountValue(0);
      toast.success(`Sale #${createdSale.id} completed.`);
      await loadProducts();
    } catch (error) {
      toast.error(error.message || "Failed to complete sale.");
    } finally {
      setCreatingSale(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Point of Sale</h2>
        <p className="page-subtitle">
          Fast checkout with live stock visibility, discounting, and receipt generation.
        </p>
      </div>

      <div className="pos-layout">
        <Card>
          <div style={{ display: "grid", gap: "0.9rem" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)"
                }}
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products by name or SKU..."
                style={{ paddingLeft: "2.2rem" }}
              />
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.45rem" }}>
                Category Filters
              </div>
              <div className="filters-row">
                <Button
                  variant={activeCategory === "all" ? "primary" : "secondary"}
                  onClick={() => setActiveCategory("all")}
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={String(activeCategory) === String(category.id) ? "primary" : "secondary"}
                    onClick={() => setActiveCategory(String(category.id))}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.45rem" }}>
                Color Filters
              </div>
              <div className="filters-row">
                <button
                  type="button"
                  className={`btn ${activeColor === "all" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setActiveColor("all")}
                >
                  Any Color
                </button>
                {colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    className={`btn ${
                      String(activeColor) === String(color.id) ? "btn-primary" : "btn-ghost"
                    }`}
                    onClick={() => setActiveColor(String(color.id))}
                    title={color.name}
                  >
                    <span className="color-dot" style={{ background: color.hex_code }} />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {productsError ? (
            <div className="alert-box" style={{ marginTop: "1rem" }}>
              {productsError}
            </div>
          ) : null}

          {loadingProducts ? (
            <LoadingState message="Loading catalog..." />
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  activeColor={activeColor}
                  isPopping={highlightProductId === product.id}
                  onAdd={addProductToCart}
                />
              ))}
            </div>
          )}

          {!loadingProducts && !products.length ? (
            <div style={{ marginTop: "1rem", color: "var(--text-muted)" }}>
              No products match the current filters.
            </div>
          ) : null}
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.7rem", color: "var(--gold-soft)" }}>Live Cart</h3>
            <Badge variant="gold">{cart.length} item types</Badge>
          </div>

          <div className="cart-list">
            {cart.map((item) => (
              <CartItem
                key={item.key}
                item={item}
                onIncrease={increaseQuantity}
                onDecrease={decreaseQuantity}
                onRemove={removeLineItem}
              />
            ))}

            {!cart.length ? (
              <div style={{ color: "var(--text-muted)", paddingTop: "0.5rem" }}>
                Cart is empty. Tap a product card to add it.
              </div>
            ) : null}
          </div>

          <div style={{ marginBottom: "0.7rem" }}>
            <div
              className="inline-form"
              style={{ justifyContent: "space-between", marginBottom: "0.5rem" }}
            >
              <label htmlFor="customer" style={{ color: "var(--text-muted)" }}>
                Customer
              </label>
              <Button
                variant="ghost"
                onClick={() => setShowQuickAddCustomer((current) => !current)}
              >
                <UserPlus size={14} /> Quick Add
              </Button>
            </div>
            <Select
              id="customer"
              value={selectedCustomerId}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              disabled={loadingReference}
            >
              <option value="">Walk-in Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>

            {showQuickAddCustomer ? (
              <div className="quick-form">
                <Input
                  placeholder="Customer name"
                  value={newCustomer.name}
                  onChange={(event) =>
                    setNewCustomer((current) => ({ ...current, name: event.target.value }))
                  }
                />
                <Input
                  placeholder="Phone number"
                  value={newCustomer.phone}
                  onChange={(event) =>
                    setNewCustomer((current) => ({ ...current, phone: event.target.value }))
                  }
                />
                <Input
                  placeholder="Email address"
                  value={newCustomer.email}
                  onChange={(event) =>
                    setNewCustomer((current) => ({ ...current, email: event.target.value }))
                  }
                />
                <div className="inline-form" style={{ justifyContent: "flex-end" }}>
                  <Button variant="secondary" onClick={handleQuickAddCustomer}>
                    Add Customer
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: "0.65rem" }}>
            <div className="inline-form">
              <label style={{ width: "84px", color: "var(--text-muted)" }}>Discount</label>
              <Select
                value={discountType}
                onChange={(event) => setDiscountType(event.target.value)}
                style={{ width: "110px" }}
              >
                <option value="none">None</option>
                <option value="percent">Percent</option>
                <option value="flat">Flat</option>
              </Select>
              <Input
                type="number"
                min="0"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                disabled={discountType === "none"}
              />
            </div>

            <div className="inline-form">
              <label style={{ width: "84px", color: "var(--text-muted)" }}>Tax</label>
              <label className="inline-form" style={{ minWidth: "80px" }}>
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={(event) => setTaxEnabled(event.target.checked)}
                />
                Enabled
              </label>
              <Input
                type="number"
                min="0"
                value={taxRate}
                onChange={(event) => setTaxRate(event.target.value)}
                disabled={!taxEnabled}
              />
            </div>
          </div>

          <div className="summary-block">
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatCurrency(totals.subtotal)}</strong>
            </div>
            <div className="summary-row">
              <span>Discount</span>
              <strong>-{formatCurrency(totals.discountAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <strong>{formatCurrency(totals.taxAmount)}</strong>
            </div>
            <div className="summary-total">
              <span>Grand Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>

          <motion.div whileTap={{ scale: 0.99 }}>
            <Button
              className=""
              style={{ width: "100%", marginTop: "0.9rem", padding: "0.9rem 1rem" }}
              disabled={!cart.length || creatingSale}
              onClick={handleCompleteSale}
            >
              {creatingSale ? "Completing Sale..." : "Complete Sale"}
            </Button>
          </motion.div>
        </Card>
      </div>

      <ReceiptModal
        sale={receiptSale}
        isOpen={Boolean(receiptSale)}
        onClose={() => setReceiptSale(null)}
      />
    </>
  );
}
