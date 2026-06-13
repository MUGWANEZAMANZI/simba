import { useEffect, useState } from "react";

export default function UserProfile({ token, user, onLogout, onLoginSuccess, t, formatCurrency }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login, register, otp
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    otp: "",
    address: "",
    district: "Gasabo"
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getItemsCount = (itemsJson) => {
    try {
      const parsed = JSON.parse(itemsJson || "[]");
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  const loadProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // We'll fetch orders for this user. Our backend me route gives user info.
      // We need a route for user orders based on their ID from token.
      const res = await fetch(`/api/user/orders`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const orders = await res.json();
        setData({ account: user, orders });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      loadProfile();
    }
  }, [token, user]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email })
      });
      const json = await res.json();
      if (res.ok) {
        setMessage(json.message);
        setAuthMode("otp");
      } else {
        setError(json.error);
      }
    } catch (e) {
      setError("Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (res.ok) {
        onLoginSuccess(json.token, json.user);
      } else {
        setError(json.error);
      }
    } catch (e) {
      setError("Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const json = await res.json();
      if (res.ok) {
        onLoginSuccess(json.token, json.user);
      } else {
        setError(json.error);
      }
    } catch (e) {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || !user) {
    return (
      <div className="auth-container card">
        {authMode === "login" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <h2>{t.signIn || 'Sign In'}</h2>
            {error && <p className="error-message">{error}</p>}
            <input
              type="email"
              placeholder="Email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            <button type="submit" disabled={loading}>{loading ? t.loading : (t.signIn || 'Sign In')}</button>
            <p>
              Don't have an account?{" "}
              <button type="button" className="link-button" onClick={() => setAuthMode("register")}>
                {t.signUp || 'Sign Up'}
              </button>
            </p>
          </form>
        )}

        {authMode === "register" && (
          <form className="auth-form" onSubmit={handleSendOTP}>
            <h2>{t.signUp || 'Sign Up'}</h2>
            {error && <p className="error-message">{error}</p>}
            <input
              type="text"
              placeholder={t.fullname || "Full Name"}
              required
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="tel"
              placeholder={t.phone || "Phone"}
              required
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            <input
              type="text"
              placeholder={t.address || "Address"}
              required
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
            <select
              value={formData.district}
              onChange={e => setFormData({ ...formData, district: e.target.value })}
            >
              {["Gasabo", "Kicukiro", "Nyarugenge"].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button type="submit" disabled={loading}>{loading ? t.loading : "Send Verification Code"}</button>
            <p>
              Already have an account?{" "}
              <button type="button" className="link-button" onClick={() => setAuthMode("login")}>
                {t.signIn || 'Sign In'}
              </button>
            </p>
          </form>
        )}

        {authMode === "otp" && (
          <form className="auth-form" onSubmit={handleRegister}>
            <h2>Verify Email</h2>
            <p className="message">{message || `We sent a code to ${formData.email}`}</p>
            {error && <p className="error-message">{error}</p>}
            <input
              type="text"
              placeholder="6-digit code"
              required
              maxLength={6}
              value={formData.otp}
              onChange={e => setFormData({ ...formData, otp: e.target.value })}
            />
            <button type="submit" disabled={loading}>{loading ? t.loading : "Verify & Register"}</button>
            <button type="button" className="ghost-button" onClick={() => setAuthMode("register")}>Back</button>
          </form>
        )}
      </div>
    );
  }

  const orders = Array.isArray(data?.orders) ? data.orders : [];

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>{t.myProfile || 'My Profile'}</h2>
        <button onClick={onLogout} className="secondary-button">{t.logout || 'Logout'}</button>
      </div>

      <div className="profile-details card">
        <h3>{user.fullName || user.full_name}</h3>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>{t.phoneLabel || 'Phone:'}</strong> {user.phone}</p>
        <p><strong>{t.addressLabel || 'Address:'}</strong> {user.address}, {user.district}</p>
      </div>

      <div className="order-history">
        <h3>{t.orderHistory || 'Order History'}</h3>
        {loading ? <p>{t.loading}</p> : orders.length === 0 ? (
          <p>{t.noOrdersYet || 'No orders yet.'}</p>
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
                    <p>{order?.created_at ? new Date(order.created_at).toLocaleString() : (t.unknownLabel || 'Unknown date')}</p>
                    <p>{t.totalLabel || 'Total'}: {formatCurrency(Number(order?.total || 0), t.locale, t.currency)}</p>
                    <p>{getItemsCount(order?.items_json)} {t.items || 'items'}</p>
                  </div>
                  <button
                    className="ghost-button"
                    onClick={() => window.location.hash = `track-${order.id}`}
                  >
                    {t.trackOrder || 'Track Order'}
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
