import { useEffect, useState } from "react";
import {
  BarChart3,
  CreditCard,
  LogOut,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  Users
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { getDashboard } from "../../api/posApi";
import { useAuth } from "../../auth/AuthContext";
import Button from "../ui/Button";

const NAV_ITEMS = [
  { to: "/", label: "Checkout", icon: CreditCard, roles: ["cashier", "manager"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["cashier", "manager"] },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3, roles: ["manager"] },
  { to: "/inventory", label: "Inventory", icon: PackageSearch, roles: ["manager"] },
  { to: "/sales", label: "Sales", icon: ReceiptText, roles: ["manager"] }
];

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loadingLowStock, setLoadingLowStock] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadLowStockCount() {
      if (role !== "manager") {
        setLowStockCount(0);
        setLoadingLowStock(false);
        return;
      }

      setLoadingLowStock(true);

      try {
        const dashboardData = await getDashboard();
        if (!isMounted) {
          return;
        }

        setLowStockCount(dashboardData?.low_stock_alerts?.length || 0);
      } catch (_error) {
        if (isMounted) {
          setLowStockCount(0);
        }
      } finally {
        if (isMounted) {
          setLoadingLowStock(false);
        }
      }
    }

    loadLowStockCount();

    return () => {
      isMounted = false;
    };
  }, [role]);

  async function handleLogout() {
    setIsSigningOut(true);

    try {
      await logout();
    } finally {
      setIsSigningOut(false);
    }
  }

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role || "")
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>Cloth POS</h1>
        <span>Luxury outlet command center</span>
      </div>

      <div className="sidebar-user">
        <div className="user-chip">
          <ShieldCheck size={14} />
          <span>{user?.full_name || "Signed in"}</span>
        </div>
        <div className="role-pill">{role || "unknown"}</div>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`.trim()
              }
            >
              <Icon size={18} />
              <span className="nav-item-text">{item.label}</span>
              {item.to === "/dashboard" ? (
                <div
                  className={`nav-alert-badge ${lowStockCount > 0 ? "has-alert" : ""}`.trim()}
                  title="Products with critically low stock"
                >
                  {loadingLowStock ? <span className="nav-badge-loader" /> : lowStockCount}
                </div>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <Button
          variant="ghost"
          className="sidebar-logout"
          onClick={handleLogout}
          isLoading={isSigningOut}
          loadingText="Signing out..."
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}

Sidebar.propTypes = {};
