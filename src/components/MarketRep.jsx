import { useEffect, useState } from "react";

export default function MarketRep({ branch, onBack, onLogout, t, formatCurrency }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
            <div className="admin-header">
                <button onClick={onBack} className="ghost-button">← {t.backToShop || 'Back to Shop'}</button>
                <h2>{branch?.name ? `${branch.name} — ${t.marketRepTitle || 'Market Rep'}` : (t.marketRepTitle || 'Market Rep')}</h2>
                <div className="admin-header-meta">
                    <span>{branch?.location}</span>
                    {onLogout ? (
                        <button onClick={onLogout} className="ghost-button">{t.logout || 'Logout'}</button>
                    ) : null}
                </div>
            </div>

            {error ? <p className="admin-auth-error">{error}</p> : null}

            <div className="card">
                <h3>{t.incomingOrders || 'Incoming Orders'}</h3>
                {loading ? (
                    <p>{t.loading || 'Loading orders…'}</p>
                ) : orders.length === 0 ? (
                    <p>{t.noOrdersForBranch || 'No orders for this branch.'}</p>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t.tableId || 'ID'}</th>
                                <th>{t.tableCustomer || 'Customer'}</th>
                                <th>{t.tableTotal || 'Total'}</th>
                                <th>{t.tableStatus || 'Status'}</th>
                                <th>{t.tableActions || 'Actions'}</th>
                                <th>{t.tableDate || 'Date'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id}>
                                    <td>#{o.id}</td>
                                    <td>{o.customer_name}</td>
                                    <td>{formatCurrency(Number(o.total || 0), t.locale, t.currency)}</td>
                                    <td>{o.status}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => updateStatus(o.id, 'accepted')}>{t.accept || 'Accept'}</button>
                                            <button onClick={() => updateStatus(o.id, 'preparing')}>{t.preparing || 'Preparing'}</button>
                                            <button onClick={() => updateStatus(o.id, 'ready')}>{t.ready || 'Ready'}</button>
                                        </div>
                                    </td>
                                    <td>{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
