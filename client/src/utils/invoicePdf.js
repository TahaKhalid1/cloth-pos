import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDateTime } from "./format";

const BRAND = {
  name: "Cloth POS",
  subtitle: "Premium Clothing Outlet",
  address: "Downtown Fashion District",
  phone: "+1 (555) 010-1000",
  reference: "Tax Ref: CLTH-INV-001"
};

function toMoney(value) {
  return formatCurrency(Number(value || 0));
}

export function downloadInvoicePdf(sale) {
  if (!sale) {
    throw new Error("Sale information is required to generate an invoice.");
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 42;

  doc.setFillColor(18, 16, 12);
  doc.rect(0, 0, pageWidth, 116, "F");

  doc.setTextColor(231, 214, 160);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(BRAND.name, marginX, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(BRAND.subtitle, marginX, 66);

  doc.setTextColor(194, 180, 145);
  doc.text(`${BRAND.address}  |  ${BRAND.phone}`, marginX, 84);

  doc.setTextColor(36, 32, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INVOICE", pageWidth - marginX, 52, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Invoice #: INV-${String(sale.id).padStart(6, "0")}`, pageWidth - marginX, 72, {
    align: "right"
  });
  doc.text(`Sale #: ${sale.id}`, pageWidth - marginX, 88, { align: "right" });
  doc.text(`Date: ${formatDateTime(sale.created_at)}`, pageWidth - marginX, 104, {
    align: "right"
  });

  doc.setTextColor(85, 79, 68);
  doc.setFont("helvetica", "bold");
  doc.text("Billed To", marginX, 146);

  doc.setFont("helvetica", "normal");
  doc.text(sale.customer_name || "Walk-in Customer", marginX, 164);

  const itemRows = (sale.items || []).map((item, index) => [
    String(index + 1),
    `${item.product_name}${item.color_name ? ` (${item.color_name})` : ""}`,
    String(item.quantity),
    toMoney(item.unit_price),
    toMoney(item.line_total)
  ]);

  autoTable(doc, {
    startY: 186,
    margin: {
      left: marginX,
      right: marginX
    },
    head: [["#", "Item", "Qty", "Unit Price", "Line Total"]],
    body: itemRows.length ? itemRows : [["-", "No items", "-", "-", "-"]],
    headStyles: {
      fillColor: [31, 27, 20],
      textColor: [231, 214, 160],
      fontStyle: "bold"
    },
    bodyStyles: {
      textColor: [48, 45, 40]
    },
    alternateRowStyles: {
      fillColor: [247, 243, 233]
    },
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 8
    },
    columnStyles: {
      0: { cellWidth: 26, halign: "center" },
      2: { cellWidth: 50, halign: "center" },
      3: { cellWidth: 94, halign: "right" },
      4: { cellWidth: 96, halign: "right" }
    }
  });

  const tableBottomY = doc.lastAutoTable?.finalY || 300;
  const totalsY = tableBottomY + 18;
  const totalsWidth = 222;
  const totalsHeight = 108;
  const totalsX = pageWidth - marginX - totalsWidth;

  doc.setDrawColor(206, 183, 120);
  doc.setFillColor(253, 249, 238);
  doc.roundedRect(totalsX, totalsY, totalsWidth, totalsHeight, 8, 8, "FD");

  const lineItems = [
    { label: "Subtotal", value: toMoney(sale.subtotal), strong: false },
    { label: "Discount", value: `-${toMoney(sale.discount_amount)}`, strong: false },
    {
      label: `Tax ${sale.tax_enabled ? `(${sale.tax_rate}%)` : "(off)"}`,
      value: toMoney(sale.tax_amount),
      strong: false
    },
    { label: "Total", value: toMoney(sale.total), strong: true }
  ];

  let currentY = totalsY + 22;
  lineItems.forEach((row) => {
    doc.setFont("helvetica", row.strong ? "bold" : "normal");
    doc.setFontSize(row.strong ? 12 : 10);
    doc.setTextColor(43, 38, 28);
    doc.text(row.label, totalsX + 14, currentY);
    doc.text(row.value, totalsX + totalsWidth - 14, currentY, { align: "right" });
    currentY += row.strong ? 26 : 20;
  });

  const footerY = Math.max(totalsY + totalsHeight + 22, pageHeight - 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(119, 110, 92);
  doc.text(`Generated on ${new Date().toLocaleString()}`, marginX, footerY);
  doc.text(BRAND.reference, pageWidth - marginX, footerY, { align: "right" });

  doc.save(`cloth-invoice-${sale.id}.pdf`);
}
