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
          Close
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
        <>
          <div className="cart-items">
            {cartItems.map((item) => (
              <article className="cart-item" key={item.id}>
                <img src={resolveProductImage(item)} alt={item.name} />
                <div>
                  <strong>{item.name}</strong>
                  <span>{formatCurrency(item.price, t.locale, t.currency)}</span>
                </div>
                <div className="qty-control">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
              </article>
            ))}
          </div>

          <div className="checkout-card">
            <div className="checkout-steps">
              <span className={checkoutStep === 0 ? "active" : ""}>{t.deliveryStep}</span>
              <span className={checkoutStep === 1 ? "active" : ""}>{t.paymentStep}</span>
              <span className={checkoutStep === 2 ? "active" : ""}>{t.reviewStep}</span>
            </div>

            {checkoutStep === 0 && (
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
              </div>
            )}

            {checkoutStep === 1 && (
              <div className="payment-options">
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
            )}

            {checkoutStep === 2 && (
              <div className="review-panel">
                <p>{form.fullname || "-"}</p>
                <p>{form.phone || "-"}</p>
                <p>{form.address || "-"}</p>
                <p>{form.district}</p>
                <p>
                  Delivery: {selectedDelivery?.name} - {formatCurrency(selectedDelivery?.fee || 0, t.locale, t.currency)}
                </p>
                <p>
                  {t.paymentMethod}: {form.paymentMethod === "momo" ? t.momo : form.paymentMethod === "cash" ? t.cash : t.card}
                </p>
              </div>
            )}

            <div className="checkout-footer">
              <div>
                <span>{t.subtotal}</span>
                <strong>{formatCurrency(subtotal, t.locale, t.currency)}</strong>
                <span className="checkout-total-line">
                  Delivery: {formatCurrency(selectedDelivery?.fee || 0, t.locale, t.currency)}
                </span>
                <strong className="checkout-total-line">
                  Total: {formatCurrency(grandTotal, t.locale, t.currency)}
                </strong>
              </div>
              {checkoutStep < 2 ? (
                <button
                  disabled={checkoutStep === 0 && !canAdvanceFromDelivery()}
                  onClick={() => {
                    if (checkoutStep === 0 && !canAdvanceFromDelivery()) {
                      setRecommendationError(t.deliveryMissing);
                      return;
                    }
                    setRecommendationError("");
                    setCheckoutStep((current) => current + 1);
                  }}
                >
                  {t.checkout}
                </button>
              ) : (
                <button disabled={orderStatus === "saving"} onClick={submitOrder}>
                  {orderStatus === "saving" ? t.orderSaving : t.placeOrder}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
