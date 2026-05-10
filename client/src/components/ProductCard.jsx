import { motion } from "framer-motion";
import PropTypes from "prop-types";
import Badge from "./ui/Badge";
import { formatCurrency } from "../utils/format";
import { getFallbackProductImage, getProductImage } from "../utils/productImages";

function hexToRgba(hex, alpha) {
  const normalizedHex = String(hex || "").trim().replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const r = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const g = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const b = Number.parseInt(normalizedHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ProductCard({ product, onAdd, isPopping = false, activeColor }) {
  const displayColor =
    activeColor && activeColor !== "all"
      ? product.colors.find((color) => String(color.id) === String(activeColor))
      : product.colors[0];
  const useColorFilter = Boolean(activeColor && activeColor !== "all" && displayColor?.hex_code);
  const imageStyle = useColorFilter
    ? { "--product-tint": hexToRgba(displayColor.hex_code, 0.32) }
    : undefined;

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
      <div
        className={`product-image ${useColorFilter ? "has-color-filter" : ""}`.trim()}
        style={imageStyle}
      >
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="product-photo"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = getFallbackProductImage();
          }}
        />
        {displayColor ? (
          <span
            className="color-dot product-color-dot"
            style={{ background: displayColor.hex_code }}
          />
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

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    stock_quantity: PropTypes.number.isRequired,
    colors: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string,
        hex_code: PropTypes.string,
        stock_quantity: PropTypes.number
      })
    ).isRequired
  }).isRequired,
  onAdd: PropTypes.func.isRequired,
  isPopping: PropTypes.bool,
  activeColor: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

ProductCard.defaultProps = {
  isPopping: false,
  activeColor: "all"
};
