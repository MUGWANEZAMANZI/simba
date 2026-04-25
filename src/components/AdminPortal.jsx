import { useEffect, useState } from "react";

const orderStatuses = ["pending", "assigned", "picked", "delivering", "delivered", "cancelled"];

export default function AdminPortal({ onBack, onLogout, adminName, branchId, t, formatCurrency }) {
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "",
    unit: "Pcs",
    location: "",
    image: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadAdminData = () => {
    setLoading(true);
    const ordersUrl = branchId ? `/api/admin/orders?branchId=${branchId}` : "/api/admin/orders";
    const productsUrl = branchId ? `/api/products?branchId=${branchId}` : "/api/products";

    Promise.all([
      fetch(ordersUrl).then((res) => (res.ok ? res.json() : [])),
      fetch("/api/admin/users").then((res) => (res.ok ? res.json() : [])),
      fetch(productsUrl).then((res) => (res.ok ? res.json() : { products: [] })),
    ])
      .then(([ordersData, usersData, productsData]) => {
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setProducts(productsData.products || []);
      })
      .catch(() => {
        setOrders([]);
        setUsers([]);
        setLoadError("Failed to load data.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdminData();
  }, [branchId]);

  const stats = {
    totalOrders: orders.length,
    activeDeliveries: orders.filter((order) => ["assigned", "picked", "delivering"].includes(order.status)).length,
    delivered: orders.filter((order) => order.status === "delivered").length,
    customers: users.length,
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status.");
      const updated = await response.json();
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (_error) {
      setLoadError("Failed to update status.");
    }
  };

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
        setNewProduct({ name: "", price: "", category: "", unit: "Pcs", location: "", image: "" });
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
        <div className="delivery-stats-grid" style={{ marginBottom: "1rem" }}>
          <article className="card delivery-stat-card"><strong>{stats.totalOrders}</strong><span>Total Orders</span></article>
          <article className="card delivery-stat-card"><strong>{stats.activeDeliveries}</strong><span>Active Delivery</span></article>
          <article className="card delivery-stat-card"><strong>{stats.delivered}</strong><span>Delivered</span></article>
          <article className="card delivery-stat-card"><strong>{stats.customers}</strong><span>Customers</span></article>
        </div>

        {activeTab === "orders" && (
          <div className="admin-section">
            <h3>Recent Orders</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Provider</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Update</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="8">No orders found.</td>
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
                        <td>{o.delivery_provider || "-"}</td>
                        <td>{o.delivery_owner || "Unassigned"}</td>
                        <td><span className={`status-badge status-${statusClass}`}>{statusLabel}</span></td>
                        <td>
                          <select
                            value={statusLabel}
                            onChange={(event) => updateOrderStatus(o.id, event.target.value)}
                          >
                            {orderStatuses.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </td>
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
            <div className="inventory-header">
              <h3>Branch Inventory</h3>
              <p>Current stock levels for {adminName}</p>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="4">No products found for this branch.</td>
                  </tr>
                ) : (
                  products.filter(p => p.quantity > 0).map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{formatCurrency(p.price, t.locale, t.currency)}</td>
                      <td>{p.quantity} {p.unit}</td>
                      <td>
                        <span className={`status-badge ${p.inStock ? "status-success" : "status-error"}`}>
                          {p.inStock ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <h3 style={{ marginTop: '2rem' }}>Add New Product</h3>
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
              <input
                type="text"
                placeholder="Location (e.g. Kigali Warehouse, Aisle 3)"
                value={newProduct.location}
                onChange={e => setNewProduct({ ...newProduct, location: e.target.value })}
                required
              />
              <input
                type="url"
                placeholder="Cloud image URL"
                value={newProduct.image}
                onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                required
              />
              <p className="hero-meta admin-form-note">
                Upload the image to a cloud service first, then paste the public link here.
              </p>
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
