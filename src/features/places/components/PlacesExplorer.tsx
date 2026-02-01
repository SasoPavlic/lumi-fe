import {
  type ChangeEvent,
  type CSSProperties,
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { hapticFeedbackNotificationOccurred } from '@telegram-apps/sdk';

import { fetchClosestPoi, getApiBaseUrl } from '@/features/places/api.ts';
import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, MIN_RADIUS_KM } from '@/features/places/constants.ts';
import type { PlacesItem, PlacesOfWorshipResponse, UserLocation } from '@/features/places/types.ts';
import {
  getStampIdFromPlace,
  loadStampedIds,
  persistStampedIds,
  clearStampedIds,
} from '@/features/places/stampsStorage.ts';

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

const CHECKIN_RADIUS_METERS = 15;
const HOLD_DURATION_MS = 3000;

function computeDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusMeters = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function formatDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters)) return '—';
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(distanceMeters)} m`;
}

export const PlacesExplorer: FC = () => {
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [status, setStatus] = useState<StatusState>(INITIAL_STATUS);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<UserLocation | null>(null);
  const [useMapCenter, setUseMapCenter] = useState(false);
  const [result, setResult] = useState<PlacesOfWorshipResponse | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [stampedIds, setStampedIds] = useState<Set<string>>(() => loadStampedIds());
  const [selectedPlace, setSelectedPlace] = useState<PlacesItem | null>(null);
  const [liveLocation, setLiveLocation] = useState<UserLocation | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const holdResetRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const isBusy = isLocating || isFetching;
  const shouldUseMapCenter = useMapCenter && !!mapCenter;
  const effectiveLocation = useMemo<UserLocation | null>(() => {
    if (shouldUseMapCenter && mapCenter) {
      return mapCenter;
    }
    return liveLocation;
  }, [shouldUseMapCenter, mapCenter, liveLocation]);
  const updateMapCenter = useCallback((coords: UserLocation) => {
    setMapCenter((prev) => {
      if (prev && Math.abs(prev.lat - coords.lat) < 1e-9 && Math.abs(prev.lon - coords.lon) < 1e-9) {
        return prev;
      }
      return coords;
    });
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (holdRafRef.current !== null) {
      cancelAnimationFrame(holdRafRef.current);
    }
    if (holdResetRef.current !== null) {
      window.clearTimeout(holdResetRef.current);
    }
    if (
      watchIdRef.current !== null
      && typeof navigator !== 'undefined'
      && navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
  }, []);

  useEffect(() => {
    persistStampedIds(stampedIds);
  }, [stampedIds]);

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

  useEffect(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (!selectedPlace) {
      setLiveLocation(null);
      setLiveError(null);
      return;
    }

    const selectedId = getStampIdFromPlace(selectedPlace);
    if (stampedIds.has(selectedId)) {
      setLiveError(null);
      return;
    }

    if (shouldUseMapCenter) {
      setLiveError(null);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLiveError('Geolocation is not supported in this environment.');
      return;
    }

    setLiveError(null);
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLiveLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        setLiveError(error.message || 'Unable to retrieve location.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      },
    );
    watchIdRef.current = watchId;
  }, [selectedPlace, stampedIds, shouldUseMapCenter]);

  const handleFindPlaces = useCallback(async () => {
    abortRef.current?.abort();

    const usingMapCenter = useMapCenter && !!mapCenter;
    setStatus({
      tone: 'info',
      text: usingMapCenter ? 'Using map center as origin…' : 'Requesting your location…',
    });
    setIsLocating(!usingMapCenter);
    setIsFetching(false);

    try {
      const location = usingMapCenter && mapCenter
        ? mapCenter
        : await requestLocation();

      setUserLocation(location);
      if (!usingMapCenter) {
        setLiveLocation(location);
        setLiveError(null);
      }
      setMapCenter((prev) => prev ?? location);
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
  }, [radiusKm, requestLocation, useMapCenter, mapCenter]);

  const buttonLabel = useMemo(() => {
    if (isLocating) return 'Requesting location…';
    if (isFetching) return 'Searching…';
    return 'Find places';
  }, [isLocating, isFetching]);

  const stampedCount = stampedIds.size;
  const selectedStampId = useMemo(
    () => (selectedPlace ? getStampIdFromPlace(selectedPlace) : null),
    [selectedPlace],
  );
  const isSelectedStamped = selectedStampId ? stampedIds.has(selectedStampId) : false;
  const distanceMeters = useMemo(() => {
    if (!selectedPlace || !effectiveLocation) return null;
    return computeDistanceMeters(
      effectiveLocation.lat,
      effectiveLocation.lon,
      selectedPlace.coordinates.latitude,
      selectedPlace.coordinates.longitude,
    );
  }, [selectedPlace, effectiveLocation]);
  const withinRange = distanceMeters !== null && distanceMeters <= CHECKIN_RADIUS_METERS;
  const canStamp = Boolean(selectedPlace && !isSelectedStamped && withinRange && !liveError);
  const distanceProgress = useMemo(() => {
    if (distanceMeters === null) return 0;
    const safeDistance = Math.max(distanceMeters, CHECKIN_RADIUS_METERS);
    return Math.min(1, CHECKIN_RADIUS_METERS / safeDistance);
  }, [distanceMeters]);

  useEffect(() => {
    if (!result || !selectedPlace) return;
    const activeId = getStampIdFromPlace(selectedPlace);
    const stillVisible = result.items.some((item) => getStampIdFromPlace(item) === activeId);
    if (!stillVisible) {
      setSelectedPlace(null);
    }
  }, [result, selectedPlace]);

  const cancelHold = useCallback((resetProgress = true) => {
    if (holdRafRef.current !== null) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    if (resetProgress) {
      setHoldProgress(0);
    }
    setIsHolding(false);
  }, []);

  const completeStamp = useCallback(() => {
    if (!selectedPlace) return;
    cancelHold(false);
    const stampId = getStampIdFromPlace(selectedPlace);
    setStampedIds((prev) => {
      if (prev.has(stampId)) return prev;
      const next = new Set(prev);
      next.add(stampId);
      return next;
    });
    if (hapticFeedbackNotificationOccurred.isAvailable()) {
      hapticFeedbackNotificationOccurred('success');
    }
    setHoldProgress(1);
    setIsHolding(false);
    if (holdResetRef.current !== null) {
      window.clearTimeout(holdResetRef.current);
    }
    holdResetRef.current = window.setTimeout(() => setHoldProgress(0), 650);
  }, [cancelHold, selectedPlace]);

  const startHold = useCallback(() => {
    if (!canStamp) return;
    if (holdResetRef.current !== null) {
      window.clearTimeout(holdResetRef.current);
      holdResetRef.current = null;
    }
    setIsHolding(true);
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / HOLD_DURATION_MS);
      setHoldProgress(progress);
      if (progress >= 1) {
        holdRafRef.current = null;
        completeStamp();
        return;
      }
      holdRafRef.current = requestAnimationFrame(tick);
    };
    holdRafRef.current = requestAnimationFrame(tick);
  }, [canStamp, completeStamp]);

  useEffect(() => {
    if (!canStamp && isHolding) {
      cancelHold(true);
    }
  }, [canStamp, isHolding, cancelHold]);

  const handleSelectPlace = useCallback((place: PlacesItem) => {
    setSelectedPlace(place);
  }, []);

  const handleClearStamps = useCallback(() => {
    if (!window.confirm('Clear all stamped places for this device?')) return;
    clearStampedIds();
    setStampedIds(new Set());
  }, []);

  let checkInButtonTitle = 'Select a place';
  let checkInButtonSubtitle = 'Tap a marker on the map';
  let checkInButtonClass = styles.checkInButtonLocked;
  let showDistanceMeter = false;
  let distanceLabel: string | null = null;

  if (selectedPlace) {
    if (isSelectedStamped) {
      checkInButtonTitle = 'Already stamped';
      checkInButtonSubtitle = 'You have collected this place.';
      checkInButtonClass = styles.checkInButtonStamped;
    } else if (liveError) {
      checkInButtonTitle = shouldUseMapCenter ? 'Map center not ready' : 'Enable GPS';
      checkInButtonSubtitle = liveError;
    } else if (distanceMeters === null) {
      checkInButtonTitle = shouldUseMapCenter ? 'Pick a map center' : 'Locating…';
      checkInButtonSubtitle = shouldUseMapCenter
        ? 'Pan the map to set the center.'
        : 'Waiting for GPS signal.';
    } else if (!withinRange) {
      checkInButtonTitle = 'Move closer';
      distanceLabel = formatDistance(distanceMeters);
      checkInButtonSubtitle = `Distance: ${distanceLabel}`;
      showDistanceMeter = true;
    } else {
      checkInButtonTitle = 'Hold 3s to stamp';
      checkInButtonSubtitle = `Within ${CHECKIN_RADIUS_METERS} m`;
      checkInButtonClass = styles.checkInButtonReady;
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.sliderRow}>
        <div className={styles.sliderHeader}>
          <span className={styles.sliderLabel}>Radius</span>
          <span className={styles.radiusValue}>{radiusKm} km</span>
        </div>
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
      <div className={styles.mapSection}>
        <MapView
          response={result}
          userLocation={userLocation}
          selectedId={selectedStampId ?? undefined}
          stampedIds={stampedIds}
          onSelect={handleSelectPlace}
          onCenterChange={updateMapCenter}
        />
      </div>

      <div className={styles.checkInCard}>
        <div className={styles.checkInHeader}>
          <div>
            <div className={styles.checkInTitle}>
              {selectedPlace ? selectedPlace.name : 'Collect a place'}
            </div>
            <div className={styles.checkInSubtitle}>
              {selectedPlace
                ? selectedPlace.category.label
                : 'Tap a marker on the map to choose your next stamp.'}
            </div>
          </div>
          <div className={styles.stampCount}>
            <span className={styles.stampCountValue}>{stampedCount}</span>
            <span className={styles.stampCountLabel}>stamped</span>
          </div>
        </div>

        <button
          type="button"
          className={[
            styles.checkInButton,
            checkInButtonClass,
            isHolding ? styles.checkInButtonHolding : '',
          ].join(' ')}
          disabled={!canStamp}
          style={{
            '--hold-progress': holdProgress,
            '--hold-active': (isHolding || holdProgress > 0) ? 1 : 0,
          } as CSSProperties}
          onPointerDown={(event) => {
            event.preventDefault();
            startHold();
          }}
          onPointerUp={() => cancelHold(true)}
          onPointerLeave={() => cancelHold(true)}
          onPointerCancel={() => cancelHold(true)}
        >
          <div className={styles.checkInButtonContent}>
            <div>
              <div className={styles.checkInButtonTitle}>{checkInButtonTitle}</div>
              <div className={styles.checkInButtonSubtitle}>{checkInButtonSubtitle}</div>
            </div>
            {withinRange && !isSelectedStamped && !liveError && selectedPlace && (
              <span className={styles.checkInIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <path d="M12 2.5l2.3 4.66 5.15.75-3.73 3.63.88 5.13L12 14.9 7.4 16.67l.88-5.13L4.55 7.91l5.15-.75L12 2.5z" />
                </svg>
              </span>
            )}
          </div>

          {showDistanceMeter && (
            <div className={styles.distanceMeter}>
              <div
                className={styles.distanceMeterFill}
                style={{ width: `${distanceProgress * 100}%` }}
              />
            </div>
          )}
        </button>
      </div>

      <section className={styles.devCard}>
        <h4 className={styles.devTitle}>Developer tools</h4>
        <p className={styles.apiInfo}>
          <span className={styles.apiInfoLabel}>API target:</span>
          <span className={styles.apiInfoValue}>{apiBaseUrl}</span>
        </p>
        <div className={styles.devActions}>
          <button
            type="button"
            className={styles.devButton}
            onClick={handleClearStamps}
          >
            Clear stamps
          </button>
        </div>
        <div className={styles.locationInfo}>
          <div>
            <div className={styles.locationLabel}>Map center</div>
            <div className={styles.locationValue}>
              {mapCenter
                ? `Lat ${mapCenter.lat.toFixed(5)}, Lon ${mapCenter.lon.toFixed(5)}`
                : 'Pan the map to pick a point'}
            </div>
          </div>
          <label className={styles.locationToggle}>
            <input
              type="checkbox"
              checked={useMapCenter}
              onChange={(event) => setUseMapCenter(event.target.checked)}
              disabled={!mapCenter}
            />
            <span>Use map center instead of GPS</span>
          </label>
        </div>
        {result && (
          <details className={styles.jsonBlock} open>
            <summary>API response payload</summary>
            <pre className={styles.json}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        )}
      </section>
    </section>
  );
};
