import { useEffect, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const defaultCenter = { lat: -1.9706, lng: 30.1044 };

let loaderPromise;

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Failed to load Google Maps."));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export default function GoogleMapPicker({ value, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let listener;

    loadGoogleMaps()
      .then((maps) => {
        if (!containerRef.current) return;

        const center = value || defaultCenter;
        mapRef.current = new maps.Map(containerRef.current, {
          center,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        markerRef.current = new maps.Marker({
          map: mapRef.current,
          position: center,
        });

        listener = mapRef.current.addListener("click", (event) => {
          const location = {
            lat: Number(event.latLng.lat().toFixed(6)),
            lng: Number(event.latLng.lng().toFixed(6)),
          };
          markerRef.current?.setPosition(location);
          onChange(location);
        });
      })
      .catch((loadError) => {
        setError(loadError.message);
      });

    return () => {
      if (listener) {
        window.google?.maps?.event?.removeListener(listener);
      }
    };
  }, []);

  useEffect(() => {
    if (value && markerRef.current && mapRef.current) {
      markerRef.current.setPosition(value);
      mapRef.current.panTo(value);
    }
  }, [value]);

  if (!GOOGLE_MAPS_API_KEY) {
    return <p className="error-text">Missing Google Maps API key.</p>;
  }

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  return <div ref={containerRef} className="google-map-picker" />;
}
