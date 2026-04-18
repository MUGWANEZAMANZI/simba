import { useEffect, useState } from "react";

export default function UserProfile({ phone, onLogout, t, formatCurrency }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const getItemsCount = (itemsJson) => {
    try {
      const parsed = JSON.parse(itemsJson || "[]");
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    fetch(`/api/user/${phone}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [phone]);

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;
  if (!data?.account) return <div className="p-8 text-center">Profile not found.</div>;

  const orders = Array.isArray(data.orders) ? data.orders : [];

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>My Profile</h2>
        <button onClick={onLogout} className="secondary-button">Logout</button>
      </div>

      <div className="profile-details card">
        <h3>{data.account.full_name}</h3>
        <p><strong>Phone:</strong> {data.account.phone}</p>
        <p><strong>Address:</strong> {data.account.address}, {data.account.district}</p>
        <p><strong>Member since:</strong> {new Date(data.account.created_at).toLocaleDateString()}</p>
      </div>

      <div className="order-history">
        <h3>Order History</h3>
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <div className="order-list">
            {orders.map((order) => {
              const statusLabel = typeof order?.status === "string" && order.status.trim()
                ? order.status
                : "pending";
              const statusClass = statusLabel.toLowerCase().replace(/[^a-z0-9-]/g, "");

              return (
                <div key={order.id} className="order-card card">
                  <div className="order-card-header">
                    <strong>Order #{order.id}</strong>
                    <span className={`status-badge status-${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="order-card-body">
                    <p>{order?.created_at ? new Date(order.created_at).toLocaleString() : "Unknown date"}</p>
                    <p>Total: {formatCurrency(Number(order?.total || 0), t.locale, t.currency)}</p>
                    <p>{getItemsCount(order?.items_json)} items</p>
                  </div>
                  <button
                    className="ghost-button"
                    onClick={() => window.location.hash = `track-${order.id}`}
                  >
                    Track Order
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
