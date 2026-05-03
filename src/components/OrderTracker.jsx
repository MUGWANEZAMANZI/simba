import { useEffect, useState, useRef } from "react";

export default function OrderTracker({ order, onBack, t }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Preparing your order...");
  const deliveredNotifiedRef = useRef(false);

  const statusToProgress = {
    pending: { progress: 12, text: "Order is being packed..." },
    assigned: { progress: 30, text: "Delivery company accepted the order." },
    picked: { progress: 55, text: "Package picked from Simba branch." },
    delivering: { progress: 80, text: "Motorbike is on the way!" },
    delivered: { progress: 100, text: "Order delivered! Enjoy your meal." },
    cancelled: { progress: 100, text: "Order was cancelled." },
  };

  function notifyDelivered() {
    const message = "Order delivered! Enjoy your meal.";

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.18);

      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.35, audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.42);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.45);
      oscillator.onended = () => audioContext.close();
    } catch (_error) {
      // Ignore audio errors
    }

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(message);
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(message);
          }
        });
      }
    }
  }

  useEffect(() => {
    if (order?.status && statusToProgress[order.status]) {
      const live = statusToProgress[order.status];
      setProgress(live.progress);
      setStatus(live.text);
      if (order.status === "delivered" && !deliveredNotifiedRef.current) {
        deliveredNotifiedRef.current = true;
        notifyDelivered();
      }
      return;
    }

    let animationFrame;
    let startTime = Date.now();
    const duration = 10000; // 10 seconds simulation

    deliveredNotifiedRef.current = false;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);

      setProgress(Math.round(p * 100));

      if (p < 0.2) setStatus("Order is being packed...");
      else if (p < 0.5) setStatus("Motorbike is on the way!");
      else if (p < 0.9) setStatus("Almost there!");
      else {
        setStatus("Order delivered! Enjoy your meal.");
        if (!deliveredNotifiedRef.current) {
          deliveredNotifiedRef.current = true;
          notifyDelivered();
        }
      }

      if (p < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [order.id]);

  return (
    <div className="order-tracker">
      <div className="tracker-header">
        <button onClick={onBack} className="ghost-button">← {t?.backToShop || 'Back'}</button>
        <h2>{(t && t.trackingOrder) ? `${t.trackingOrder} #${order.id}` : `Tracking Order #${order.id}`}</h2>
      </div>

      <div className="tracker-content card">
        <div className="tracker-status">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="status-text">{status}</p>
          <p className="progress-percent">{progress}% {(t && t.completeLabel) || 'Complete'}</p>
        </div>

        <div className="order-summary-mini" style={{ marginTop: "2rem" }}>
          <p><strong>Deliver to:</strong> {order.address}, {order.district}</p>
          <p><strong>Provider:</strong> {order.delivery_provider}</p>
          <p className="hero-meta">Live map tracking is currently disabled.</p>
        </div>
      </div>
    </div>
  );
}
