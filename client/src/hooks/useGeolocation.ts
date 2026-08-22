import { useState, useCallback } from 'react';

interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  error?: string;
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback((): Promise<GeolocationResult> => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      setError(null);

      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by your browser.';
        setError(err);
        setLoading(false);
        reject(new Error(err));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result: GeolocationResult = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(result);
          setLoading(false);
          resolve(result);
        },
        (err) => {
          let message = 'Unable to retrieve your location.';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              message = 'Location permission is required to mark attendance. Please enable location access and try again.';
              break;
            case err.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable. Please try again.';
              break;
            case err.TIMEOUT:
              message = 'Location request timed out. Please try again.';
              break;
          }
          setError(message);
          setLoading(false);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { location, loading, error, getLocation };
}
