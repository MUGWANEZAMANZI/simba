import { useEffect, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const STORE_LOCATION = { lat: -1.9706, lng: 30.1044 };

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
  script.async = true;
  script.defer = true;
  return new Promise((resolve) => {
    script.onload = () => resolve(window.google.maps);
    document.head.appendChild(script);
  });
}

export default function OrderTracker({ order, onBack }) {
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Preparing your order...");
  const bikeMarkerRef = useRef(null);
  const deliveredNotifiedRef = useRef(false);

  const destination = { lat: order.latitude, lng: order.longitude };

  function notifyDelivered() {
    const message = "Order delivered! Enjoy your meal.";

    // Play a short browser beep to alert the customer.
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
      // Ignore audio errors (for example when autoplay is blocked).
    }

    // Also show a browser notification when available.
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
    let animationFrame;
    let startTime = Date.now();
    const duration = 15000; // 15 seconds for simulation

    deliveredNotifiedRef.current = false;

    loadGoogleMaps().then((maps) => {
      const map = new maps.Map(containerRef.current, {
        center: STORE_LOCATION,
        zoom: 13,
        disableDefaultUI: true,
      });

      // Store marker
      new maps.Marker({
        position: STORE_LOCATION,
        map,
        label: "S",
        title: "Simba Supermarket",
      });

      // User marker
      new maps.Marker({
        position: destination,
        map,
        label: "U",
        title: "Your Location",
      });

      // Motorbike marker (using a simple icon or label)
      bikeMarkerRef.current = new maps.Marker({
        position: STORE_LOCATION,
        map,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#e63946",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#ffffff",
        },
        title: "Delivery Motorbike",
      });

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const p = Math.min(elapsed / duration, 1);

        setProgress(Math.round(p * 100));

        if (p < 0.2) setStatus("Order is being packed...");
        else if (p < 0.9) setStatus("Motorbike is on the way!");
        else if (p < 1) setStatus("Almost there!");
        else {
          setStatus("Order delivered! Enjoy your meal.");
          if (!deliveredNotifiedRef.current) {
            deliveredNotifiedRef.current = true;
            notifyDelivered();
          }
        }

        const currentLat = STORE_LOCATION.lat + (destination.lat - STORE_LOCATION.lat) * p;
        const currentLng = STORE_LOCATION.lng + (destination.lng - STORE_LOCATION.lng) * p;

        const newPos = { lat: currentLat, lng: currentLng };
        bikeMarkerRef.current.setPosition(newPos);
        map.panTo(newPos);

        if (p < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animate();
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [order.id]);

  return (
    <div className="order-tracker">
      <div className="tracker-header">
        <button onClick={onBack} className="ghost-button">← Back</button>
        <h2>Tracking Order #{order.id}</h2>
      </div>

      <div className="tracker-content card">
        <div className="tracker-status">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="status-text">{status}</p>
          <p className="progress-percent">{progress}% Complete</p>
        </div>

        <div ref={containerRef} className="tracker-map" style={{ height: "400px", borderRadius: "12px" }} />

        <div className="order-summary-mini">
          <p><strong>Deliver to:</strong> {order.address}</p>
          <p><strong>Provider:</strong> {order.delivery_provider}</p>
        </div>
      </div>
    </div>
  );
}
