import {
  BarChart3,
  CreditCard,
  PackageSearch,
  ReceiptText,
  Users
} from "lucide-react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Checkout", icon: CreditCard },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/inventory", label: "Inventory", icon: PackageSearch },
  { to: "/sales", label: "Sales", icon: ReceiptText },
  { to: "/customers", label: "Customers", icon: Users }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>Cloth POS</h1>
        <span>Luxury outlet command center</span>
      </div>

      <nav className="nav-list" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
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
    </aside>
  );
}
