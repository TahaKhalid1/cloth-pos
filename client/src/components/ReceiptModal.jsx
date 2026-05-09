import { FileDown, Printer } from "lucide-react";
import { toast } from "react-hot-toast";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import { formatCurrency, formatDateTime } from "../utils/format";
import { downloadInvoicePdf } from "../utils/invoicePdf";

export default function ReceiptModal({ sale, isOpen, onClose }) {
  if (!sale) {
    return null;
  }

  function handleDownloadPdf() {
    try {
      downloadInvoicePdf(sale);
      toast.success(`Invoice #${sale.id} downloaded.`);
    } catch (error) {
      toast.error(error.message || "Failed to generate invoice PDF.");
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title={`Receipt #${sale.id}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={handleDownloadPdf}>
            <FileDown size={15} /> Download PDF Invoice
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print Receipt
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="receipt-print-area">
        <h3>Cloth POS</h3>
        <p style={{ marginBottom: "0.65rem", color: "#333" }}>
          Premium Clothing Outlet
        </p>

        <div className="receipt-row">
          <span>Sale ID</span>
          <strong>#{sale.id}</strong>
        </div>
        <div className="receipt-row">
          <span>Timestamp</span>
          <strong>{formatDateTime(sale.created_at)}</strong>
        </div>
        <div className="receipt-row">
          <span>Customer</span>
          <strong>{sale.customer_name || "Walk-in"}</strong>
        </div>

        <hr style={{ margin: "0.9rem 0" }} />

        {(sale.items || []).map((item) => (
          <div key={item.id} className="receipt-row">
            <span>
              {item.product_name}
              {item.color_name ? ` (${item.color_name})` : ""} x{item.quantity}
            </span>
            <strong>{formatCurrency(item.line_total)}</strong>
          </div>
        ))}

        <hr style={{ margin: "0.9rem 0" }} />

        <div className="receipt-row">
          <span>Subtotal</span>
          <strong>{formatCurrency(sale.subtotal)}</strong>
        </div>
        <div className="receipt-row">
          <span>
            Discount
            <Badge variant="muted" style={{ marginLeft: "0.45rem" }}>
              {sale.discount_type}
            </Badge>
          </span>
          <strong>-{formatCurrency(sale.discount_amount)}</strong>
        </div>
        <div className="receipt-row">
          <span>
            Tax {sale.tax_enabled ? `(${sale.tax_rate}%)` : "(off)"}
          </span>
          <strong>{formatCurrency(sale.tax_amount)}</strong>
        </div>

        <hr style={{ margin: "0.9rem 0" }} />

        <div className="receipt-row" style={{ fontSize: "1.1rem" }}>
          <span>Total</span>
          <strong>{formatCurrency(sale.total)}</strong>
        </div>
      </div>
    </Modal>
  );
}
