import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/layout/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import POSPage from "./pages/POSPage";
import InventoryPage from "./pages/InventoryPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import CustomersPage from "./pages/CustomersPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import LoginPage from "./pages/LoginPage";

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.25, ease: "easeOut" }
};

export default function App() {
  const location = useLocation();
  const { isAuthenticated, isInitializing } = useAuth();

  function renderPageBoundary(title, page) {
    return (
      <ErrorBoundary title={title} resetKey={location.pathname}>
        {page}
      </ErrorBoundary>
    );
  }

  if (isInitializing) {
    return <div className="loading-state">Initializing secure session...</div>;
  }

  if (!isAuthenticated) {
    return (
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
            <Route
              path="/login"
              element={renderPageBoundary("Login page failed", <LoginPage />)}
            />
            <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
          </Routes>
        </motion.section>
      </AnimatePresence>
    );
  }

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
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    {renderPageBoundary("Checkout page failed", <POSPage />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute>
                    {renderPageBoundary("Customers page failed", <CustomersPage />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    {renderPageBoundary("Dashboard page failed", <DashboardPage />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    {renderPageBoundary("Inventory page failed", <InventoryPage />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    {renderPageBoundary("Sales history page failed", <SalesHistoryPage />)}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forbidden"
                element={
                  <ProtectedRoute>
                    {renderPageBoundary("Access page failed", <ForbiddenPage />)}
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}

App.propTypes = {};
