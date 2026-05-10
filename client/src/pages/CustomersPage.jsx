import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import LoadingState from "../components/ui/LoadingState";
import Table from "../components/ui/Table";
import { createCustomer, getCustomers } from "../api/posApi";
import { formatCurrency, formatDateTime } from "../utils/format";

const INITIAL_FORM = {
  name: "",
  phone: "",
  email: ""
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const customerData = await getCustomers();
      setCustomers(customerData);
    } catch (loadError) {
      setError(loadError.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function handleAddCustomer(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error("Please complete all customer fields.");
      return;
    }

    setSubmitting(true);

    try {
      await createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim()
      });
      setForm(INITIAL_FORM);
      toast.success("Customer added.");
      await loadCustomers();
    } catch (submitError) {
      toast.error(submitError.message || "Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Customers</h2>
        <p className="page-subtitle">
          Manage customer profiles with total spend and purchase activity summaries.
        </p>
      </div>

      <section className="grid-2">
        <Card>
          <h3 style={{ marginBottom: "0.75rem" }}>Add Customer</h3>
          <form onSubmit={handleAddCustomer} style={{ display: "grid", gap: "0.65rem" }}>
            <Input
              placeholder="Full name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <Button
              type="submit"
              disabled={submitting}
              isLoading={submitting}
              loadingText="Adding..."
            >
              Add Customer
            </Button>
          </form>
        </Card>

        <Card>
          <h3 style={{ marginBottom: "0.75rem" }}>Customer Summary</h3>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div className="inline-form" style={{ justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Total Customers</span>
              <strong>{customers.length}</strong>
            </div>
            <div className="inline-form" style={{ justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Lifetime Customer Revenue</span>
              <strong>
                {formatCurrency(
                  customers.reduce(
                    (sum, customer) => sum + Number(customer.total_spent || 0),
                    0
                  )
                )}
              </strong>
            </div>
          </div>
        </Card>
      </section>

      <Card style={{ marginTop: "1rem" }}>
        {error ? <div className="alert-box">{error}</div> : null}

        {loading ? (
          <LoadingState message="Loading customers..." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Purchases</th>
                <th>Total Spent</th>
                <th>Last Purchase</th>
              </tr>
            </thead>
            <tbody>
              {customers.length ? (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.email}</td>
                    <td>{customer.purchase_count}</td>
                    <td>{formatCurrency(customer.total_spent)}</td>
                    <td>{formatDateTime(customer.last_purchase_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No customers found.</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

CustomersPage.propTypes = {};
