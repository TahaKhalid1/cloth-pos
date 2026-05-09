import Button from "./ui/Button";
import Badge from "./ui/Badge";
import { formatCurrency } from "../utils/format";

export default function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="cart-item">
      <div className="cart-title-row">
        <div>
          <strong>{item.name}</strong>
          <div style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>
            {item.color_name || "Standard"}
          </div>
        </div>
        <Button variant="ghost" onClick={() => onRemove(item.key)}>
          Remove
        </Button>
      </div>

      <div className="cart-meta-row" style={{ marginTop: "0.55rem" }}>
        <Badge variant="muted">Unit {formatCurrency(item.unit_price)}</Badge>
        <div className="stepper">
          <button type="button" onClick={() => onDecrease(item.key)}>
            -
          </button>
          <span>{item.quantity}</span>
          <button type="button" onClick={() => onIncrease(item.key)}>
            +
          </button>
        </div>
      </div>

      <div className="cart-meta-row" style={{ marginTop: "0.55rem" }}>
        <span style={{ color: "var(--text-muted)" }}>
          Subtotal ({item.quantity} x {formatCurrency(item.unit_price)})
        </span>
        <strong>{formatCurrency(item.quantity * item.unit_price)}</strong>
      </div>
    </div>
  );
}
