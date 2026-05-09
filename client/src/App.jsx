import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import POSPage from "./pages/POSPage";
import InventoryPage from "./pages/InventoryPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import CustomersPage from "./pages/CustomersPage";

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.25, ease: "easeOut" }
};

export default function App() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-pane">
        <AnimatePresence mode="wait">
          <motion.section
            key={location.pathname}
            className="page-shell"
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition}
          >
            <Routes location={location}>
              <Route path="/" element={<POSPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/sales" element={<SalesHistoryPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}
