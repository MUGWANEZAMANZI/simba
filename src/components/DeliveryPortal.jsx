import { useEffect, useMemo, useState } from "react";

const deliveryStatuses = ["pending", "assigned", "picked", "delivering", "delivered", "cancelled"];

export default function DeliveryPortal({ onBack, providerId, providerLabel, ownerName, t, formatCurrency, onLogout }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const loadOrders = async () => {
        if (!providerId || !ownerName) return;

        setLoading(true);
        setError("");
        try {
            const response = await fetch(
                `/api/delivery/orders?provider=${encodeURIComponent(providerId)}&owner=${encodeURIComponent(ownerName)}`,
            );
            if (!response.ok) throw new Error("Failed to load delivery orders.");
            const data = await response.json();
            setOrders(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Failed to load delivery orders.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, [providerId, ownerName]);

    const stats = useMemo(() => {
        const initial = { total: orders.length };
        deliveryStatuses.forEach((status) => {
            initial[status] = 0;
        });
        orders.forEach((order) => {
            const key = deliveryStatuses.includes(order.status) ? order.status : "pending";
            initial[key] += 1;
        });
        return initial;
    }, [orders]);

    const updateOrderStatus = async (orderId, nextStatus) => {
        try {
            const response = await fetch(`/api/delivery/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus, owner: ownerName }),
            });
            if (!response.ok) throw new Error("Failed to update order status.");
            const updated = await response.json();
            setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        } catch (err) {
            setError(err.message || "Failed to update order status.");
        }
    };

    return (
        <div className="admin-portal delivery-portal">
            <div className="admin-header">
                <button onClick={onBack} className="ghost-button">← {t.backToShop || 'Back to Shop'}</button>
                <h2>{t.deliveryPortalTitle || 'Delivery Company Portal'}</h2>
                <div className="admin-header-meta">
                    <span>{providerLabel} • {ownerName}</span>
                    <button className="ghost-button" onClick={loadOrders}>{t.refresh || 'Refresh'}</button>
                    {onLogout ? <button className="ghost-button" onClick={onLogout}>{t.logout || 'Logout'}</button> : null}
                </div>
            </div>

            <div className="delivery-stats-grid">
                <article className="card delivery-stat-card"><strong>{stats.total}</strong><span>{t.totalLabel || 'Total'}</span></article>
                <article className="card delivery-stat-card"><strong>{stats.pending}</strong><span>{t.pendingLabel || 'Pending'}</span></article>
                <article className="card delivery-stat-card"><strong>{stats.assigned}</strong><span>{t.assignedLabel || 'Assigned'}</span></article>
                <article className="card delivery-stat-card"><strong>{stats.delivering}</strong><span>{t.deliveringLabel || 'Delivering'}</span></article>
                <article className="card delivery-stat-card"><strong>{stats.delivered}</strong><span>{t.deliveredLabel || 'Delivered'}</span></article>
            </div>

            <section className="card delivery-orders-wrap">
                <div className="section-heading">
                    <h3>{t.ordersToDeliver || 'Orders To Deliver'}</h3>
                    <p>{loading ? (t.loading || 'Loading...') : `${orders.length} ${t.ordersCountLabel || 'orders'}`}</p>
                </div>

                {error ? <p className="admin-auth-error">{error}</p> : null}

                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{t.tableId || 'ID'}</th>
                            <th>{t.tableCustomer || 'Customer'}</th>
                            <th>{t.tableAddress || 'Address'}</th>
                            <th>{t.tableTotal || 'Total'}</th>
                            <th>{t.tableStatus || 'Status'}</th>
                            <th>{t.tableUpdate || 'Update'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 ? (
                            <tr><td colSpan="6">{t.noDeliveryOrdersFound || 'No delivery orders found for this provider.'}</td></tr>
                        ) : (
                            orders.map((order) => {
                                const currentStatus = order.status || "pending";
                                const statusClass = currentStatus.toLowerCase().replace(/[^a-z0-9-]/g, "");
                                return (
                                    <tr key={order.id}>
                                        <td>#{order.id}</td>
                                        <td>{order.customer_name}</td>
                                        <td>{order.address}, {order.district}</td>
                                        <td>{formatCurrency(Number(order.total || 0), t.locale, t.currency)}</td>
                                        <td><span className={`status-badge status-${statusClass}`}>{currentStatus}</span></td>
                                        <td>
                                            <select
                                                value={currentStatus}
                                                onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                                            >
                                                {deliveryStatuses.map((status) => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
