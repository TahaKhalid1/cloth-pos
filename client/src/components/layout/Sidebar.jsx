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
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <Button variant="ghost" className="sidebar-logout" onClick={logout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
