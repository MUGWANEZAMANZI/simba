import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";

function LocationPickerMap({ location, onPick }) {
  const fallbackCenter = [-1.9441, 30.0619];
  const center = location ? [location.lat, location.lng] : fallbackCenter;

  function ClickHandler() {
    useMapEvents({
      click(event) {
        onPick({
          lat: Number(event.latlng.lat.toFixed(6)),
          lng: Number(event.latlng.lng.toFixed(6)),
        });
      },
    });
    return null;
  }

  return (
    <div className="google-map-picker">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler />
        {location ? <CircleMarker center={[location.lat, location.lng]} radius={9} pathOptions={{ color: "#e17732" }} /> : null}
      </MapContainer>
    </div>
  );
}

export default function CartDrawer({
  cartOpen,
  setCartOpen,
  t,
  cartCount,
  cartItems,
  checkoutComplete,
  setCheckoutComplete,
  setCheckoutStep,
  checkoutStep,
  authToken,
  form,
  setForm,
  updateQuantity,
  formatCurrency,
  subtotal,
  selectedDelivery,
  grandTotal,
  canAdvanceFromDelivery,
  setRecommendationError,
  orderStatus,
  submitOrder,
  resolveProductImage,
  deliveryOptions,
  deliveryDistanceKm,
}) {
  const isAuthenticated = !!authToken;

  return (
    <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"}>
      <div className="cart-header">
        <div>
          <h3>{t.cart}</h3>
          <p>
            {cartCount} {t.items}
          </p>
        </div>
        <button className="ghost-button" onClick={() => setCartOpen(false)}>
          {t.close || 'Close'}
        </button>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-state">
          <p>{t.emptyCart}</p>
          <button onClick={() => setCartOpen(false)}>{t.backToShop}</button>
        </div>
      ) : checkoutComplete ? (
        <div className="checkout-card success">
          <h4>{t.orderReady}</h4>
          <p>{t.orderText}</p>
          <button
            onClick={() => {
              setCheckoutComplete(false);
              setCartOpen(false);
              setCheckoutStep(0);
            }}
          >
            {t.continueShopping}
          </button>
        </div>
      ) : (
        <div className="catalogue-products-window">
          <div className="checkout-steps">
            <span className={checkoutStep === 0 ? "active" : ""}>1. {t.cart}</span>
            <span className={checkoutStep === 1 ? "active" : ""}>2. {t.deliveryStep}</span>
            <span className={checkoutStep === 2 ? "active" : ""}>3. {t.paymentStep}</span>
          </div>

          {checkoutStep === 0 && (
            <>
              <div className="cart-items">
                {cartItems.map((item) => (
                  <article className="cart-item" key={item.id}>
                    <img src={resolveProductImage(item)} alt={item.name} />
                    <div>
                      <strong>{item.name}</strong>
                      {item.originalPrice ? (
                        <div className="price-block">
                          <span className="product-price strike">
                            {formatCurrency(item.originalPrice, t.locale, t.currency)}
                          </span>
                          <span className="product-price discounted">
                            {formatCurrency(item.effectivePrice, t.locale, t.currency)}
                          </span>
                          <span className="discount-badge">Black Friday -{item.discountPercent}%</span>
                        </div>
                      ) : (
                        <span>{formatCurrency(item.price, t.locale, t.currency)}</span>
                      )}
                    </div>
                    <div className="qty-control">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="checkout-card" style={{ border: 'none', boxShadow: 'none', padding: '1rem 0 0' }}>
                <div className="checkout-footer">
                  <div>
                    <span>{t.subtotal}</span>
                    <strong>{formatCurrency(subtotal, t.locale, t.currency)}</strong>
                  </div>
                  <button onClick={() => setCheckoutStep(1)}>
                    {t.checkout || 'Proceed to Checkout'}
                  </button>
                </div>
              </div>
            </>
          )}

          {checkoutStep === 1 && (
            <div className="checkout-card">
              <div className="checkout-form">
                <input
                  placeholder={t.fullname}
                  value={form.fullname}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullname: event.target.value }))
                  }
                />
                <input
                  placeholder={t.phone}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
                <input
                  placeholder={t.address}
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, address: event.target.value }))
                  }
                />
                <select
                  value={form.district}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, district: event.target.value }))
                  }
                >
                  {["Gasabo", "Kicukiro", "Nyarugenge", "Musanze", "Rubavu"].map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                <div className="delivery-options">
                  {deliveryOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={form.deliveryProvider === option.id ? "payment-pill active" : "payment-pill"}
                      onClick={() =>
                        setForm((current) => ({ ...current, deliveryProvider: option.id }))
                      }
                    >
                      {option.name}: {formatCurrency(option.fee, t.locale, t.currency)}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="hero-meta">{t.locationPicker || 'Pick delivery point on map (click anywhere)'}</p>
                  <LocationPickerMap
                    location={form.location}
                    onPick={(location) => setForm((current) => ({ ...current, location }))}
                  />
                  <p className="hero-meta" style={{ marginTop: "0.5rem" }}>
                    {form.location
                      ? `Lat ${form.location.lat}, Lng ${form.location.lng}`
                      : (t.noLocationSelected || 'No location selected yet.')}
                  </p>
                </div>
              </div>

              <div className="checkout-footer">
                <div>
                  <span>{t.subtotal}</span>
                  <strong>{formatCurrency(subtotal, t.locale, t.currency)}</strong>
                  <span className="checkout-total-line">
                    Delivery: {formatCurrency(selectedDelivery?.fee || 0, t.locale, t.currency)}
                  </span>
                  <span className="checkout-total-line">Distance: {deliveryDistanceKm} km</span>
                  <strong className="checkout-total-line">
                    Total: {formatCurrency(grandTotal, t.locale, t.currency)}
                  </strong>
                </div>
                <div className="checkout-footer-actions">
                  <button className="ghost-button" onClick={() => setCheckoutStep(0)}>
                    {t.back || 'Back'}
                  </button>
                  <button
                    disabled={!canAdvanceFromDelivery()}
                    onClick={() => {
                      if (!canAdvanceFromDelivery()) {
                        setRecommendationError(t.deliveryMissing);
                        return;
                      }
                      setRecommendationError("");
                      setCheckoutStep(2);
                    }}
                  >
                    {t.continue || 'Continue'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {checkoutStep === 2 && (
            <div className="checkout-card">
              {!isAuthenticated && (
                <div className="checkout-form">
                  <h4 style={{ margin: '0 0 0.75rem' }}>{t.shippingInfo || 'Shipping Information'}</h4>
                  <input
                    placeholder={t.fullname}
                    value={form.fullname}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, fullname: event.target.value }))
                    }
                  />
                  <input
                    placeholder={t.phone}
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                  <input
                    placeholder={t.address}
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, address: event.target.value }))
                    }
                  />
                </div>
              )}

              <div className="payment-options">
                <h4 style={{ margin: '0 0 0.75rem' }}>{t.paymentMethod}</h4>
                {["momo", "cash", "card"].map((method) => (
                  <button
                    key={method}
                    className={form.paymentMethod === method ? "payment-pill active" : "payment-pill"}
                    onClick={() => setForm((current) => ({ ...current, paymentMethod: method }))}
                  >
                    {method === "momo" ? t.momo : method === "cash" ? t.cash : t.card}
                  </button>
                ))}
                <p>{t.paymentHint}</p>
              </div>

              <div className="checkout-footer">
                <div>
                  <span>{t.subtotal}</span>
                  <strong>{formatCurrency(subtotal, t.locale, t.currency)}</strong>
                  <span className="checkout-total-line">
                    Delivery: {formatCurrency(selectedDelivery?.fee || 0, t.locale, t.currency)}
                  </span>
                  <span className="checkout-total-line">Distance: {deliveryDistanceKm} km</span>
                  <strong className="checkout-total-line">
                    Total: {formatCurrency(grandTotal, t.locale, t.currency)}
                  </strong>
                </div>
                <div className="checkout-footer-actions">
                  <button className="ghost-button" onClick={() => setCheckoutStep(1)}>
                    {t.back || 'Back'}
                  </button>
                  <button disabled={orderStatus === "saving"} onClick={submitOrder}>
                    {orderStatus === "saving" ? t.orderSaving : t.placeOrder}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
