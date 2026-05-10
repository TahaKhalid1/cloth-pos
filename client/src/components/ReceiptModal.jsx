import PropTypes from "prop-types";
import { FileDown, Printer } from "lucide-react";
import { toast } from "react-hot-toast";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import { formatCurrency, formatDateTime } from "../utils/format";
import { downloadInvoicePdf } from "../utils/invoicePdf";

function getReceiptDateCode(rawDate) {
  const parsedDate = rawDate ? new Date(rawDate) : new Date();
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function buildReceiptNumber(sale) {
  const suffix = String(sale?.id || 0).padStart(4, "0").slice(-4);
  return `#RCT-${getReceiptDateCode(sale?.created_at)}-${suffix}`;
}

export default function ReceiptModal({ sale, isOpen, onClose }) {
  if (!sale) {
    return null;
  }

  const receiptNumber = buildReceiptNumber(sale);

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
      title={`Receipt ${receiptNumber}`}
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
        <div className="receipt-brand">
          <h3>The Cloth Outlet</h3>
          <p>Premium fashion for everyday confidence.</p>
          <p>Downtown Fashion District | +1 (555) 010-1000</p>
        </div>

        <div className="receipt-row">
          <span>Receipt No.</span>
          <strong>{receiptNumber}</strong>
        </div>

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

        <div className="receipt-thank-you">
          Thank you for shopping with The Cloth Outlet.
        </div>
      </div>
    </Modal>
  );
}

ReceiptModal.propTypes = {
  sale: PropTypes.shape({
    id: PropTypes.number,
    created_at: PropTypes.string,
    customer_name: PropTypes.string,
    subtotal: PropTypes.number,
    discount_type: PropTypes.string,
    discount_amount: PropTypes.number,
    tax_enabled: PropTypes.bool,
    tax_rate: PropTypes.number,
    tax_amount: PropTypes.number,
    total: PropTypes.number,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        product_name: PropTypes.string,
        color_name: PropTypes.string,
        quantity: PropTypes.number,
        line_total: PropTypes.number
      })
    )
  }),
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired
};

ReceiptModal.defaultProps = {
  sale: null,
  isOpen: false
};
