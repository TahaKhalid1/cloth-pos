import { motion } from "framer-motion";
import Badge from "./ui/Badge";
import { formatCurrency } from "../utils/format";

export default function ProductCard({ product, onAdd, isPopping = false, activeColor }) {
  const displayColor =
    activeColor && activeColor !== "all"
      ? product.colors.find((color) => String(color.id) === String(activeColor))
      : product.colors[0];

  return (
    <motion.article
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      className={`product-card ${isPopping ? "pop" : ""}`.trim()}
      onClick={() => onAdd(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onAdd(product);
        }
      }}
    >
      <div className="product-image">
        {displayColor ? (
          <span className="color-dot" style={{ background: displayColor.hex_code }} />
        ) : null}
      </div>
      <div className="product-body">
        <div className="product-name">{product.name}</div>
        <div className="product-meta">
          <strong>{formatCurrency(product.price)}</strong>
          <Badge variant={product.stock_quantity < 10 ? "danger" : "success"}>
            Stock {product.stock_quantity}
          </Badge>
        </div>
      </div>
    </motion.article>
  );
}
