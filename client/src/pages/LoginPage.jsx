import { useMemo, useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const returnPath = useMemo(() => {
    return location.state?.from?.pathname || "/";
  }, [location.state]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.username.trim() || !form.password) {
      toast.error("Enter username and password.");
      return;
    }

    setSubmitting(true);

    try {
      const user = await login({
        username: form.username.trim(),
        password: form.password
      });

      toast.success(`Welcome back, ${user.full_name}.`);
      navigate(returnPath, { replace: true });
    } catch (error) {
      toast.error(error.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <ShieldCheck size={20} />
          <span>Cloth POS Secure Access</span>
        </div>

        <h1>Sign In</h1>
        <p>
          Role-based access is enabled. Cashiers can run checkout, while managers can
          access analytics and inventory controls.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <Input
              value={form.username}
              autoComplete="username"
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
              }
              placeholder="manager or cashier"
            />
          </label>

          <label>
            Password
            <Input
              type="password"
              value={form.password}
              autoComplete="current-password"
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Enter your password"
            />
          </label>

          <Button type="submit" className="auth-submit" disabled={submitting}>
            <LogIn size={16} /> {submitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="auth-hints">
          <div className="auth-hint">
            <strong>Manager Demo</strong>
            <span>Username: manager</span>
            <span>Password: Manager@123</span>
          </div>
          <div className="auth-hint">
            <strong>Cashier Demo</strong>
            <span>Username: cashier</span>
            <span>Password: Cashier@123</span>
          </div>
        </div>
      </section>
    </div>
  );
}
