import {
  type ChangeEvent,
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { fetchClosestPoi, getApiBaseUrl } from '@/features/places/api.ts';
import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, MIN_RADIUS_KM, getCategoryColor } from '@/features/places/constants.ts';
import type { PlacesOfWorshipResponse, UserLocation } from '@/features/places/types.ts';

import { MapView } from './MapView.tsx';
import styles from './PlacesExplorer.module.css';

type StatusTone = 'info' | 'success' | 'error';

interface StatusState {
  tone: StatusTone;
  text: string;
}

const INITIAL_STATUS: StatusState = {
  tone: 'info',
  text: 'Pick a radius and tap “Find places” to load nearby points of worship.',
};

export const PlacesExplorer: FC = () => {
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [status, setStatus] = useState<StatusState>(INITIAL_STATUS);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [result, setResult] = useState<PlacesOfWorshipResponse | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const isBusy = isLocating || isFetching;

  useEffect(() => () => {
    abortRef.current?.abort();
  }, []);

  const handleRadiusChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setRadiusKm(Number(event.target.value));
  }, []);

  const requestLocation = useCallback(async (): Promise<UserLocation> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported in this environment.');
    }

    return new Promise<UserLocation>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }),
        (error) => {
          reject(new Error(error.message || 'Unable to retrieve location.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        },
      );
    });
  }, []);

  const handleFindPlaces = useCallback(async () => {
    abortRef.current?.abort();

    setStatus({ tone: 'info', text: 'Requesting your location…' });
    setIsLocating(true);
    setIsFetching(false);

    try {
      const location = await requestLocation();
      setUserLocation(location);
      setIsLocating(false);
      setIsFetching(true);
      setStatus({ tone: 'info', text: 'Searching for nearby places of worship…' });

      const controller = new AbortController();
      abortRef.current = controller;

      const data = await fetchClosestPoi({
        lat: location.lat,
        lon: location.lon,
        radiusKm,
        signal: controller.signal,
      });

      setResult(data);
      setStatus({
        tone: 'success',
        text: `Found ${data.count} places within ${(data.radiusMeters / 1000).toFixed(1)} km.`,
      });
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        return;
      }
      const message = error instanceof Error
        ? error.message
        : 'Something went wrong while searching for places.';
      setStatus({ tone: 'error', text: message });
    } finally {
      setIsLocating(false);
      setIsFetching(false);
      abortRef.current = null;
    }
  }, [radiusKm, requestLocation]);

  const buttonLabel = useMemo(() => {
    if (isLocating) return 'Requesting location…';
    if (isFetching) return 'Searching…';
    return 'Find places';
  }, [isLocating, isFetching]);

  const categories = result?.categories ?? [];

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Places of Worship Explorer</h3>
        <p className={styles.subtitle}>
          Query the Lumigram backend for nearby churches, chapels, and shrines powered by
          OpenStreetMap data.
        </p>
      </div>

      <div className={styles.sliderRow}>
        <span className={styles.sliderLabel}>Radius</span>
        <input
          type="range"
          min={MIN_RADIUS_KM}
          max={MAX_RADIUS_KM}
          step={1}
          value={radiusKm}
          onChange={handleRadiusChange}
          className={styles.slider}
          aria-valuemin={MIN_RADIUS_KM}
          aria-valuemax={MAX_RADIUS_KM}
          aria-valuenow={radiusKm}
          aria-label="Search radius in kilometers"
        />
        <span className={styles.radiusValue}>{radiusKm} km</span>
      </div>

      <button
        type="button"
        onClick={handleFindPlaces}
        disabled={isBusy}
        className={styles.button}
      >
        {buttonLabel}
      </button>
      <div
        className={[
          styles.status,
          status.tone === 'success' ? styles.statusSuccess : '',
          status.tone === 'error' ? styles.statusError : '',
        ].join(' ')}
      >
        {status.text}
      </div>
      <p className={styles.apiInfo}>
        <span className={styles.apiInfoLabel}>API target:</span>
        <span className={styles.apiInfoValue}>{apiBaseUrl}</span>
      </p>

      <div className={styles.mapSection}>
        <MapView response={result} userLocation={userLocation}/>
      </div>

      {result && (
        <div className={styles.summary}>
          <p className={styles.summaryHeader}>
            {result.count} places within {(result.radiusMeters / 1000).toFixed(1)} km
          </p>
          <ul className={styles.categories}>
            {categories.map((category) => (
              <li key={`${category.key}:${category.value}`} className={styles.categoryItem}>
                <span
                  className={styles.categoryDot}
                  style={{ backgroundColor: getCategoryColor(category.key, category.value) }}
                />
                <span>{category.label}</span>
                <span>• {category.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <details className={styles.jsonBlock} open>
          <summary>API response payload</summary>
          <pre className={styles.json}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      )}
    </section>
  );
};
