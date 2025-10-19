import { useEffect, useRef, useState } from 'react';
import { isSupported, safeMount, safeUnmount, requestLocation as tgRequestLocation, openSettings } from './locationManager';

export interface UseTelegramLocationOptions {
  // fallback to browser geolocation if Telegram LocationManager not available or fails
  fallbackToBrowser?: boolean;
  // also try legacy WebApp.requestLocation if available
  fallbackToWebApp?: boolean;
  // high accuracy for browser geolocation
  highAccuracy?: boolean;
}

export interface UseTelegramLocationResult {
  supported: boolean;
  loading: boolean;
  error?: string;
  coords?: { lat: number; lng: number };
  openSettings: () => void;
}

export function useTelegramLocation(options?: UseTelegramLocationOptions): UseTelegramLocationResult {
  const { fallbackToBrowser = true, fallbackToWebApp = true, highAccuracy = true } = options || {};
  const [supported] = useState<boolean>(() => isSupported());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    (async () => {
      setLoading(true);
      setError(undefined);
      try {
        // 1) Try Telegram LocationManager
        if (supported) {
          const mounted = await safeMount();
          if (mounted) {
            const loc = await tgRequestLocation();
            if (!cancelledRef.current && typeof loc?.latitude === 'number' && typeof loc?.longitude === 'number') {
              setCoords({ lat: loc.latitude, lng: loc.longitude });
              return;
            }
          }
        }

        // 2) Try legacy WebApp.requestLocation
        if (fallbackToWebApp) {
          const tg = (window as any)?.Telegram?.WebApp;
          if (tg && typeof tg.requestLocation === 'function') {
            const loc = await tg.requestLocation();
            if (!cancelledRef.current && typeof loc?.latitude === 'number' && typeof loc?.longitude === 'number') {
              setCoords({ lat: loc.latitude, lng: loc.longitude });
              return;
            }
          }
        }

        // 3) Fallback to browser Geolocation API
        if (fallbackToBrowser && navigator.geolocation) {
          await new Promise<void>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (!cancelledRef.current) {
                  setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                }
                resolve();
              },
              (err) => reject(new Error(err.message)),
              { enableHighAccuracy: highAccuracy, timeout: 12000, maximumAge: 30000 },
            );
          });
          return;
        }

        throw new Error('No available location provider.');
      } catch (e: any) {
        if (!cancelledRef.current) setError(e?.message || 'Failed to get location');
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelledRef.current = true;
      safeUnmount();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { supported, loading, error, coords, openSettings };
}
