import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import LoadingState from "../components/ui/LoadingState";
import Modal from "../components/ui/Modal";
import Select from "../components/ui/Select";
import Table from "../components/ui/Table";
import {
  createProduct,
  getCategories,
  getColors,
  getProducts,
  updateProduct
} from "../api/posApi";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { formatCurrency } from "../utils/format";

const INITIAL_FORM = {
  name: "",
  category_id: "",
  price: "",
  stock_quantity: "",
  description: "",
  selected_color_ids: []
};

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [drafts, setDrafts] = useState({});
  const [savingProductId, setSavingProductId] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_FORM);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [reorderProduct, setReorderProduct] = useState(null);
  const [reorderStockQuantity, setReorderStockQuantity] = useState("");
  const [reorderingProductId, setReorderingProductId] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 280);

  const loadReferenceData = useCallback(async () => {
    const [categoryData, colorData] = await Promise.all([
      getCategories(),
      getColors()
    ]);

    setCategories(categoryData);
    setColors(colorData);

    setAddForm((current) => ({
      ...current,
      selected_color_ids: colorData.map((color) => String(color.id))
    }));
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const filters = {};
      if (debouncedSearch.trim()) {
        filters.search = debouncedSearch.trim();
      }
      if (categoryFilter !== "all") {
        filters.category = categoryFilter;
      }

      const productData = await getProducts(filters);
      setProducts(productData);
      setDrafts(
        Object.fromEntries(
          productData.map((product) => [
            product.id,
            {
              price: product.price,
              stock_quantity: product.stock_quantity
            }
          ])
        )
      );
    } catch (loadError) {
      setError(loadError.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, debouncedSearch]);

  useEffect(() => {
    (async () => {
      try {
        await loadReferenceData();
      } catch (loadError) {
        setError(loadError.message || "Failed to initialize inventory page.");
      }
    })();
  }, [loadReferenceData]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const inventoryTotals = useMemo(() => {
    return products.reduce(
      (summary, product) => {
        summary.totalProducts += 1;
        summary.totalUnits += Number(product.stock_quantity || 0);
        summary.inventoryValue += Number(product.stock_quantity || 0) * Number(product.price || 0);
        return summary;
      },
      { totalProducts: 0, totalUnits: 0, inventoryValue: 0 }
    );
  }, [products]);

  async function handleSaveInline(productId) {
    const draft = drafts[productId];
    if (!draft) {
      return;
    }

    if (Number(draft.price) < 0 || Number(draft.stock_quantity) < 0) {
      toast.error("Price and stock must be non-negative.");
      return;
    }

    setSavingProductId(productId);

    try {
      const updatedProduct = await updateProduct(productId, {
        price: Number(draft.price),
        stock_quantity: Number(draft.stock_quantity)
      });

      setProducts((current) =>
        current.map((product) => (product.id === productId ? updatedProduct : product))
      );
      toast.success("Stock updated.");
    } catch (saveError) {
      toast.error(saveError.message || "Failed to update product.");
    } finally {
      setSavingProductId(null);
    }
  }

  function toggleColorSelection(colorId) {
    setAddForm((current) => {
      const idString = String(colorId);
      const selected = new Set(current.selected_color_ids);

      if (selected.has(idString)) {
        selected.delete(idString);
      } else {
        selected.add(idString);
      }

      return {
        ...current,
        selected_color_ids: Array.from(selected)
      };
    });
  }

  async function handleCreateProduct(event) {
    event.preventDefault();

    if (!addForm.name.trim() || !addForm.category_id || !addForm.price || !addForm.stock_quantity) {
      toast.error("Enter product name, category, price, and stock.");
      return;
    }

    if (!addForm.selected_color_ids.length) {
      toast.error("Select at least one color variant.");
      return;
    }

    setCreatingProduct(true);

    try {
      const totalStock = Number(addForm.stock_quantity);
      const selectedColorIds = addForm.selected_color_ids.map((id) => Number(id));
      const stockBase = Math.floor(totalStock / selectedColorIds.length);
      const stockRemainder = totalStock % selectedColorIds.length;

      const colorPayload = selectedColorIds.map((colorId, index) => ({
        color_id: colorId,
        stock_quantity: stockBase + (index < stockRemainder ? 1 : 0)
      }));

      await createProduct({
        name: addForm.name.trim(),
        category_id: Number(addForm.category_id),
        price: Number(addForm.price),
        stock_quantity: totalStock,
        description: addForm.description.trim(),
        colors: colorPayload
      });

      toast.success("Product added to inventory.");
      setAddForm({
        ...INITIAL_FORM,
        selected_color_ids: colors.map((color) => String(color.id))
      });
      setShowAddModal(false);
      await loadProducts();
    } catch (createError) {
      toast.error(createError.message || "Failed to create product.");
    } finally {
      setCreatingProduct(false);
    }
  }

  function openReorderModal(product) {
    setReorderProduct(product);
    setReorderStockQuantity(String(product.stock_quantity || 0));
  }

  function closeReorderModal() {
    setReorderProduct(null);
    setReorderStockQuantity("");
  }

  async function handleConfirmReorder() {
    if (!reorderProduct) {
      return;
    }

    const nextStock = Number.parseInt(reorderStockQuantity, 10);

    if (!Number.isFinite(nextStock) || nextStock < 0) {
      toast.error("Stock quantity must be a non-negative integer.");
      return;
    }

    setReorderingProductId(reorderProduct.id);

    try {
      const updatedProduct = await updateProduct(reorderProduct.id, {
        stock_quantity: nextStock
      });

      setProducts((current) =>
        current.map((product) =>
          product.id === reorderProduct.id ? updatedProduct : product
        )
      );
      setDrafts((current) => ({
        ...current,
        [reorderProduct.id]: {
          ...current[reorderProduct.id],
          stock_quantity: updatedProduct.stock_quantity,
          price: updatedProduct.price
        }
      }));
      toast.success("Reorder stock updated.");
      closeReorderModal();
    } catch (error) {
      toast.error(error.message || "Failed to reorder stock.");
    } finally {
      setReorderingProductId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Inventory</h2>
        <p className="page-subtitle">
          Manage stock depth, pricing adjustments, and catalog additions in real time.
        </p>
      </div>

      <section className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <Card>
          <div className="kpi-label">Products</div>
          <div className="kpi-value">{inventoryTotals.totalProducts}</div>
        </Card>
        <Card>
          <div className="kpi-label">Units In Stock</div>
          <div className="kpi-value">{inventoryTotals.totalUnits}</div>
        </Card>
        <Card>
          <div className="kpi-label">Inventory Value</div>
          <div className="kpi-value">{formatCurrency(inventoryTotals.inventoryValue)}</div>
        </Card>
      </section>

      <Card>
        <div className="filters-row" style={{ justifyContent: "space-between", marginBottom: "0.9rem" }}>
          <div className="inline-form" style={{ flexWrap: "wrap" }}>
            <Input
              placeholder="Search product or SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ minWidth: "260px" }}
            />
            <Select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              style={{ minWidth: "180px" }}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Product
          </Button>
        </div>

        {error ? <div className="alert-box">{error}</div> : null}

        {loading ? (
          <LoadingState message="Loading inventory..." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.length ? (
                products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{product.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        {product.sku}
                      </div>
                    </td>
                    <td>{product.category_name}</td>
                    <td>
                      <div className="filters-row">
                        {product.colors.map((color) => (
                          <span
                            key={`${product.id}-${color.id}`}
                            title={`${color.name} (${color.stock_quantity})`}
                            className="color-dot"
                            style={{ background: color.hex_code }}
                          />
                        ))}
                      </div>
                    </td>
                    <td>
                      <Input
                        type="number"
                        min="0"
                        value={drafts[product.id]?.price ?? product.price}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [product.id]: {
                              ...current[product.id],
                              price: event.target.value
                            }
                          }))
                        }
                        style={{ minWidth: "110px" }}
                      />
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: "0.4rem" }}>
                        <Input
                          type="number"
                          min="0"
                          value={drafts[product.id]?.stock_quantity ?? product.stock_quantity}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [product.id]: {
                                ...current[product.id],
                                stock_quantity: event.target.value
                              }
                            }))
                          }
                          style={{ minWidth: "94px" }}
                        />
                        {Number(product.stock_quantity) < 5 ? (
                          <span className="low-stock-badge">Low stock</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="inline-form" style={{ flexWrap: "wrap" }}>
                        <Button
                          variant="secondary"
                          onClick={() => handleSaveInline(product.id)}
                          disabled={savingProductId === product.id}
                          isLoading={savingProductId === product.id}
                          loadingText="Saving..."
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => openReorderModal(product)}
                          disabled={reorderingProductId === product.id}
                        >
                          Reorder
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No products found for the current filters.</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={showAddModal}
        title="Add New Product"
        onClose={() => setShowAddModal(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-product-form"
              disabled={creatingProduct}
              isLoading={creatingProduct}
              loadingText="Creating..."
            >
              Create Product
            </Button>
          </>
        }
      >
        <form id="add-product-form" onSubmit={handleCreateProduct} style={{ display: "grid", gap: "0.75rem" }}>
          <Input
            placeholder="Product name"
            value={addForm.name}
            onChange={(event) =>
              setAddForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <Select
            value={addForm.category_id}
            onChange={(event) =>
              setAddForm((current) => ({ ...current, category_id: event.target.value }))
            }
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <div className="inline-form">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Price"
              value={addForm.price}
              onChange={(event) =>
                setAddForm((current) => ({ ...current, price: event.target.value }))
              }
            />
            <Input
              type="number"
              min="0"
              placeholder="Total stock"
              value={addForm.stock_quantity}
              onChange={(event) =>
                setAddForm((current) => ({ ...current, stock_quantity: event.target.value }))
              }
            />
          </div>
          <textarea
            className="textarea"
            placeholder="Description"
            value={addForm.description}
            onChange={(event) =>
              setAddForm((current) => ({ ...current, description: event.target.value }))
            }
          />

          <div>
            <div style={{ marginBottom: "0.5rem", color: "var(--text-muted)" }}>
              Color Variants
            </div>
            <div className="filters-row">
              {colors.map((color) => {
                const checked = addForm.selected_color_ids.includes(String(color.id));

                return (
                  <label
                    key={color.id}
                    className={`btn ${checked ? "btn-primary" : "btn-ghost"}`}
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleColorSelection(color.id)}
                      style={{ display: "none" }}
                    />
                    <span className="color-dot" style={{ background: color.hex_code }} />
                    {color.name}
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(reorderProduct)}
        title={reorderProduct ? `Reorder ${reorderProduct.name}` : "Reorder Product"}
        onClose={closeReorderModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeReorderModal}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReorder}
              isLoading={Boolean(reorderProduct && reorderingProductId === reorderProduct.id)}
              loadingText="Updating..."
            >
              Update Stock
            </Button>
          </>
        }
      >
        {reorderProduct ? (
          <div style={{ display: "grid", gap: "0.7rem" }}>
            <div style={{ color: "var(--text-muted)" }}>
              Set the new stock quantity for <strong>{reorderProduct.name}</strong>.
            </div>
            <Input
              type="number"
              min="0"
              value={reorderStockQuantity}
              onChange={(event) => setReorderStockQuantity(event.target.value)}
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}

InventoryPage.propTypes = {};
