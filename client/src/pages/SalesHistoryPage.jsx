import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import LoadingState from "../components/ui/LoadingState";
import Table from "../components/ui/Table";
import { getSales } from "../api/posApi";
import { buildSalesCsvRows, downloadCsv } from "../utils/csv";
import { formatCurrency, formatDateTime } from "../utils/format";

const PAGE_SIZE = 12;

export default function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const [expandedSaleIds, setExpandedSaleIds] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  const loadSales = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getSales({
        page,
        pageSize: PAGE_SIZE,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      setSales(response.data || []);
      setPagination(response.pagination);
    } catch (loadError) {
      setError(loadError.message || "Failed to load sales history.");
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  function toggleExpanded(saleId) {
    setExpandedSaleIds((current) => {
      const next = new Set(current);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  }

  async function exportFilteredSales() {
    setExporting(true);

    try {
      const response = await getSales({
        page: 1,
        pageSize: 1000,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      const csvRows = buildSalesCsvRows(response.data || []);
      downloadCsv(`sales-export-${new Date().toISOString().slice(0, 10)}.csv`, csvRows);
      toast.success("Sales CSV exported.");
    } catch (exportError) {
      toast.error(exportError.message || "Unable to export CSV.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Sales History</h2>
        <p className="page-subtitle">
          Track every completed transaction with itemized details and date-range exports.
        </p>
      </div>

      <Card>
        <div className="filters-row" style={{ justifyContent: "space-between", marginBottom: "0.9rem" }}>
          <div className="inline-form" style={{ flexWrap: "wrap" }}>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
            />
            <Button variant="secondary" onClick={loadSales}>
              Apply
            </Button>
          </div>

          <Button
            variant="secondary"
            onClick={exportFilteredSales}
            disabled={exporting}
            isLoading={exporting}
            loadingText="Exporting..."
          >
            <Download size={16} /> Export CSV
          </Button>
        </div>

        {error ? <div className="alert-box">{error}</div> : null}

        {loading ? (
          <LoadingState message="Loading sales ledger..." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th />
                <th>Sale ID</th>
                <th>Timestamp</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.length ? (
                sales.map((sale) => {
                  const expanded = expandedSaleIds.has(sale.id);

                  return (
                    <Fragment key={sale.id}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => toggleExpanded(sale.id)}
                            style={{ padding: "0.35rem 0.5rem" }}
                          >
                            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td>#{sale.id}</td>
                        <td>{formatDateTime(sale.created_at)}</td>
                        <td>{sale.customer_name || "Walk-in"}</td>
                        <td>{sale.items.length}</td>
                        <td>{formatCurrency(sale.total)}</td>
                      </tr>

                      {expanded ? (
                        <tr>
                          <td colSpan={6}>
                            <div style={{ padding: "0.6rem", borderRadius: "10px", background: "rgba(255,255,255,0.03)" }}>
                              <strong>Line Items</strong>
                              <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.3rem" }}>
                                {sale.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="inline-form"
                                    style={{ justifyContent: "space-between" }}
                                  >
                                    <span>
                                      {item.product_name}
                                      {item.color_name ? ` (${item.color_name})` : ""} x{item.quantity}
                                    </span>
                                    <strong>{formatCurrency(item.line_total)}</strong>
                                  </div>
                                ))}
                                {!sale.items.length ? (
                                  <span style={{ color: "var(--text-muted)" }}>
                                    No line items.
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>No sales found for the selected range.</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}

        <div className="inline-form" style={{ justifyContent: "space-between", marginTop: "0.9rem" }}>
          <span style={{ color: "var(--text-muted)" }}>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} sales)
          </span>
          <div className="inline-form">
            <Button
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}

SalesHistoryPage.propTypes = {};
