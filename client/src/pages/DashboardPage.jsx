import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import Card from "../components/ui/Card";
import LoadingState from "../components/ui/LoadingState";
import Table from "../components/ui/Table";
import { getDashboard } from "../api/posApi";
import { formatCurrency, formatDateTime } from "../utils/format";

const PIE_COLORS = [
  "#c9a84c",
  "#e7d6a0",
  "#9f8340",
  "#7b6530",
  "#d6bf75",
  "#b39649"
];

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboardData() {
    setLoading(true);
    setError("");

    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch (loadError) {
      setError(loadError.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return <LoadingState message="Compiling performance metrics..." />;
  }

  if (error) {
    return <div className="alert-box">{error}</div>;
  }

  if (!dashboard) {
    return <div className="alert-box">No dashboard data found.</div>;
  }

  const weeklyTrend = dashboard.kpis.weekly_trend || {
    direction: "up",
    delta: 0,
    percent: 0
  };
  const weeklyTrendArrow = weeklyTrend.direction === "down" ? "▼" : "▲";
  const weeklyTrendPercent = Number(weeklyTrend.percent || 0);

  const kpiCards = [
    {
      label: "Today's Revenue",
      value: formatCurrency(dashboard.kpis.today_revenue)
    },
    {
      label: "Weekly Revenue",
      value: formatCurrency(dashboard.kpis.weekly_revenue),
      trendDirection: weeklyTrend.direction,
      trend: `${weeklyTrendArrow} ${formatCurrency(Math.abs(weeklyTrend.delta || 0))} (${weeklyTrendPercent.toFixed(1)}%) vs previous week`
    },
    {
      label: "Monthly Revenue",
      value: formatCurrency(dashboard.kpis.monthly_revenue)
    },
    {
      label: "Total Transactions",
      value: dashboard.kpis.total_transactions
    }
  ];

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Sales Dashboard</h2>
        <p className="page-subtitle">
          Revenue intelligence, movement trends, and inventory risk signals.
        </p>
      </div>

      <section className="kpi-grid">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            {kpi.trend ? (
              <div
                className={`kpi-trend ${
                  kpi.trendDirection === "down" ? "down" : "up"
                }`.trim()}
              >
                {kpi.trend}
              </div>
            ) : null}
          </Card>
        ))}
      </section>

      <section className="grid-2">
        <Card>
          <h3 style={{ marginBottom: "0.8rem" }}>Sales Last 7 Days</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={dashboard.sales_last_7_days}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201, 168, 76, 0.12)" />
                <XAxis dataKey="date" stroke="#b9ae8f" fontSize={12} />
                <YAxis stroke="#b9ae8f" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#161412",
                    border: "1px solid rgba(201, 168, 76, 0.3)",
                    borderRadius: "10px"
                  }}
                />
                <Bar dataKey="revenue" fill="#c9a84c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 style={{ marginBottom: "0.8rem" }}>Revenue by Category</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={dashboard.revenue_by_category}
                  dataKey="revenue"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={3}
                >
                  {dashboard.revenue_by_category.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.id}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    background: "#161412",
                    border: "1px solid rgba(201, 168, 76, 0.3)",
                    borderRadius: "10px"
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section style={{ marginTop: "1rem" }}>
        <Card>
          <h3 style={{ marginBottom: "0.8rem" }}>Top 5 Best Sellers</h3>
          <Table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Product</th>
                <th>Units Sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.top_products.length ? (
                dashboard.top_products.map((product, index) => (
                  <tr key={product.id}>
                    <td>#{index + 1}</td>
                    <td>{product.name}</td>
                    <td>{product.quantity_sold}</td>
                    <td>{formatCurrency(product.revenue)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No best-seller data available yet.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </section>

      <section className="grid-2" style={{ marginTop: "1rem" }}>
        <Card>
          <h3 style={{ marginBottom: "0.8rem" }}>Low Stock Alerts</h3>
          <Table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.low_stock_alerts.length ? (
                dashboard.low_stock_alerts.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category_name}</td>
                    <td>{item.stock_quantity}</td>
                    <td>{formatCurrency(item.price)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No low-stock items under threshold.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>

        <Card>
          <h3 style={{ marginBottom: "0.8rem" }}>Recent Transactions</h3>
          <Table>
            <thead>
              <tr>
                <th>Sale</th>
                <th>Customer</th>
                <th>Timestamp</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recent_transactions.length ? (
                dashboard.recent_transactions.map((sale) => (
                  <tr key={sale.id}>
                    <td>#{sale.id}</td>
                    <td>{sale.customer_name || "Walk-in"}</td>
                    <td>{formatDateTime(sale.created_at)}</td>
                    <td>{formatCurrency(sale.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No sales recorded yet.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </section>
    </>
  );
}

DashboardPage.propTypes = {};
