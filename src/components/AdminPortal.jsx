import { useEffect, useState } from "react";

export default function AdminPortal({ onBack, onLogout, adminName, t, formatCurrency }) {
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "", unit: "Pcs" });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/orders").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/admin/users").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([ordersData, usersData]) => {
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      })
      .catch(() => {
        setOrders([]);
        setUsers([]);
        setLoadError("Failed to load admin data.");
      });
  }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        alert("Product added successfully!");
        setNewProduct({ name: "", price: "", category: "", unit: "Pcs" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <button onClick={onBack} className="ghost-button">← Back to Shop</button>
        <h2>Admin Management</h2>
        <div className="admin-header-meta">
          <span>{adminName ? `Admin: ${adminName}` : "Admin"}</span>
          {onLogout ? (
            <button onClick={onLogout} className="ghost-button">Logout</button>
          ) : null}
        </div>
      </div>

      {loadError ? <p className="admin-auth-error">{loadError}</p> : null}

      <div className="admin-tabs">
        <button className={activeTab === "orders" ? "active" : ""} onClick={() => setActiveTab("orders")}>Orders</button>
        <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>Users</button>
        <button className={activeTab === "inventory" ? "active" : ""} onClick={() => setActiveTab("inventory")}>Inventory</button>
      </div>

      <div className="admin-content card">
        {activeTab === "orders" && (
          <div className="admin-section">
            <h3>Recent Orders</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="5">No orders found.</td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const statusLabel = typeof o?.status === "string" && o.status.trim() ? o.status : "pending";
                    const statusClass = statusLabel.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    return (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{o.customer_name || "Unknown"}</td>
                        <td>{formatCurrency(Number(o.total || 0), t.locale, t.currency)}</td>
                        <td><span className={`status-badge status-${statusClass}`}>{statusLabel}</span></td>
                        <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : "Unknown"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "users" && (
          <div className="admin-section">
            <h3>Customers</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Last Order</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="4">No users found.</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name || "Unknown"}</td>
                      <td>{u.phone || "N/A"}</td>
                      <td>{u.address || "N/A"}</td>
                      <td>{u.last_order_at ? new Date(u.last_order_at).toLocaleDateString() : "Unknown"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="admin-section">
            <h3>Add New Product</h3>
            <form onSubmit={handleAddProduct} className="admin-form">
              <input
                type="text"
                placeholder="Product Name"
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Price (RWF)"
                value={newProduct.price}
                onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                required
              />
              <input
                type="text"
                placeholder="Category (e.g. Food Products)"
                value={newProduct.category}
                onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Unit (e.g. Pcs, Kg)"
                value={newProduct.unit}
                onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                required
              />
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? "Adding..." : "Add Product"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
