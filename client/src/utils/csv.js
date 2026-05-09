export function buildSalesCsvRows(sales = []) {
  const headers = [
    "Sale ID",
    "Timestamp",
    "Customer",
    "Subtotal",
    "Discount",
    "Tax",
    "Total",
    "Items"
  ];

  const rows = sales.map((sale) => {
    const itemsText = (sale.items || [])
      .map(
        (item) =>
          `${item.product_name}${item.color_name ? ` (${item.color_name})` : ""} x${item.quantity}`
      )
      .join(" | ");

    return [
      sale.id,
      sale.created_at,
      sale.customer_name || "Walk-in",
      Number(sale.subtotal || 0).toFixed(2),
      Number(sale.discount_amount || 0).toFixed(2),
      Number(sale.tax_amount || 0).toFixed(2),
      Number(sale.total || 0).toFixed(2),
      itemsText
    ];
  });

  return [headers, ...rows];
}

export function downloadCsv(filename, rows) {
  const escapedRows = rows.map((row) =>
    row
      .map((cell) => {
        const value = String(cell ?? "").replace(/"/g, '""');
        return `"${value}"`;
      })
      .join(",")
  );

  const csvContent = `${escapedRows.join("\n")}\n`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const blobUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.setAttribute("download", filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(blobUrl);
}
