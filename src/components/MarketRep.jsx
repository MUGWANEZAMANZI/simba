import { useEffect, useMemo, useState } from "react";

const MARKET_STATUSES = ["pending", "accepted", "preparing", "ready"];

function parseItems(order) {
  try {
    const items = JSON.parse(order.items_json || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function statusClass(status) {
  return `status-badge status-${String(status || "pending").toLowerCase()}`;
}

export default function MarketRep({ branch, onBack, onLogout, t, formatCurrency }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    if (!branch?.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders?branchId=${branch.id}`);
      if (!res.ok) throw new Error("Failed to load orders.");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [branch?.id]);

  const stats = useMemo(() => {
    const summary = {
      total: orders.length,
      pending: 0,
      accepted: 0,
      preparing: 0,
      ready: 0,
      revenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    };

    orders.forEach((order) => {
      const status = String(order.status || "pending").toLowerCase();
      if (status in summary) summary[status] += 1;
    });

    return summary;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((order) => String(order.status || "pending").toLowerCase() === statusFilter);
  }, [orders, statusFilter]);

  const updateStatus = async (orderId, status) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setOrders((cur) => cur.map((o) => (o.id === updated.id ? updated : o)));
    } catch (e) {
      setError(e.message || "Failed to update status.");
    }
  };

  return (
    <div className="market-rep-portal">
      <div className="admin-header market-header">
        <button onClick={onBack} className="ghost-button">Back to shop</button>
        <div>
          <p className="eyebrow">{branch?.location}</p>
          <h2>{branch?.name ? `${branch.name} - ${t.marketRepTitle || "Market Rep"}` : (t.marketRepTitle || "Market Rep")}</h2>
        </div>
        <div className="admin-header-meta">
          <button onClick={load} className="secondary-button">{t.refresh || "Refresh"}</button>
          {onLogout ? (
            <button onClick={onLogout} className="ghost-button">{t.logout || "Logout"}</button>
          ) : null}
        </div>
      </div>

      {error ? <p className="admin-auth-error">{error}</p> : null}

      <section className="market-stats-grid">
        <article className="market-stat-card">
          <span>{t.totalLabel || "Total"}</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="market-stat-card">
          <span>{t.pendingLabel || "Pending"}</span>
          <strong>{stats.pending}</strong>
        </article>
        <article className="market-stat-card">
          <span>{t.preparing || "Preparing"}</span>
          <strong>{stats.preparing}</strong>
        </article>
        <article className="market-stat-card">
          <span>{t.ready || "Ready"}</span>
          <strong>{stats.ready}</strong>
        </article>
        <article className="market-stat-card">
          <span>{t.totalLabel || "Total"}</span>
          <strong>{formatCurrency(stats.revenue, t.locale, t.currency)}</strong>
        </article>
      </section>

      <section className="market-board card">
        <div className="market-board-toolbar">
          <div>
            <h3>{t.incomingOrders || "Incoming Orders"}</h3>
            <p>{visibleOrders.length} {t.ordersCountLabel || "orders"}</p>
          </div>
          <div className="market-filter-tabs">
            {["all", ...MARKET_STATUSES].map((status) => (
              <button
                key={status}
                className={statusFilter === status ? "active" : ""}
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? t.allCategories || "All" : status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p>{t.loading || "Loading..."}</p>
        ) : visibleOrders.length === 0 ? (
          <p>{t.noOrdersForBranch || "No orders for this branch."}</p>
        ) : (
          <div className="market-order-grid">
            {visibleOrders.map((order) => {
              const items = parseItems(order);
              return (
                <article className="market-order-card" key={order.id}>
                  <div className="market-order-top">
                    <div>
                      <strong>#{order.id}</strong>
                      <p>{order.customer_name}</p>
                    </div>
                    <span className={statusClass(order.status)}>{order.status}</span>
                  </div>
                  <div className="market-order-meta">
                    <span>{order.phone}</span>
                    <span>{order.address}, {order.district}</span>
                    <span>{order.delivery_provider}</span>
                  </div>
                  <div className="market-order-items">
                    {items.slice(0, 3).map((item) => (
                      <span key={`${order.id}-${item.id}`}>{item.quantity} x {item.name}</span>
                    ))}
                    {items.length > 3 ? <span>+{items.length - 3} more</span> : null}
                  </div>
                  <div className="market-order-footer">
                    <strong>{formatCurrency(Number(order.total || 0), t.locale, t.currency)}</strong>
                    <small>{order.created_at ? new Date(order.created_at).toLocaleString(t.locale) : "-"}</small>
                  </div>
                  <div className="market-actions">
                    <button onClick={() => updateStatus(order.id, "accepted")}>{t.accept || "Accept"}</button>
                    <button onClick={() => updateStatus(order.id, "preparing")}>{t.preparing || "Preparing"}</button>
                    <button onClick={() => updateStatus(order.id, "ready")}>{t.ready || "Ready"}</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
