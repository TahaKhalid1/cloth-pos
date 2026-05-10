import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import { useAuth } from "../auth/AuthContext";

export default function ForbiddenPage() {
  const { role } = useAuth();

  return (
    <div className="forbidden-shell">
      <Card>
        <div className="forbidden-content">
          <ShieldAlert size={26} />
          <h2>Permission Required</h2>
          <p>
            Your current role ({role || "unknown"}) does not have access to that page.
          </p>
          <Link to="/" className="btn btn-secondary">
            Back to Checkout
          </Link>
        </div>
      </Card>
    </div>
  );
}

ForbiddenPage.propTypes = {};
