import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { divIcon, latLngBounds, type LatLngExpression } from 'leaflet';

import { getCategoryColor } from '@/features/places/constants.ts';
import type {
  PlacesItem,
  PlacesOfWorshipResponse,
  UserLocation,
} from '@/features/places/types.ts';
import { getStampIdFromPlace } from '@/features/places/stampsStorage.ts';

import styles from './MapView.module.css';

interface MapViewProps {
  response: PlacesOfWorshipResponse | null;
  userLocation: UserLocation | null;
  selectedId?: string;
  stampedIds?: Set<string>;
  onSelect?: (place: PlacesItem) => void;
  onCenterChange?: (coords: UserLocation) => void;
}

const EARTH_RADIUS_METERS = 6_371_000;
const EPSILON = 1e-6;

function coordsEqual(a: UserLocation, b: UserLocation): boolean {
  return Math.abs(a.lat - b.lat) < EPSILON && Math.abs(a.lon - b.lon) < EPSILON;
}

const FitBounds: FC<{
  userLocation: UserLocation;
  items: PlacesItem[];
  radiusMeters?: number;
}> = ({ userLocation, items, radiusMeters }) => {
  const map = useMap();

  useEffect(() => {
    const points: LatLngExpression[] = [
      [userLocation.lat, userLocation.lon],
    ];
    items.forEach((item) => {
      points.push([item.coordinates.latitude, item.coordinates.longitude]);
    });

    if (!points.length) {
      return;
    }

    const bounds = latLngBounds(points);

    if (radiusMeters && radiusMeters > 0) {
      const latOffset = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
      const lonOffset = latOffset / Math.cos(userLocation.lat * (Math.PI / 180));
      bounds.extend([
        [userLocation.lat + latOffset, userLocation.lon + lonOffset],
        [userLocation.lat - latOffset, userLocation.lon - lonOffset],
      ]);
    }

    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, items, userLocation, radiusMeters]);

  return null;
};

function formatDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(distanceMeters)} m`;
}

function createStampedIcon(color: string, isSelected: boolean) {
  const selectedClass = isSelected ? ` ${styles.poiMarkerSelected}` : '';
  return divIcon({
    className: styles.poiMarkerWrapper,
    html: `
      <div class="${styles.poiMarkerShell}${selectedClass}" style="--poi-color: ${color};">
        <div class="${styles.poiMarkerStamped}"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

const CenterTracker: FC<{
  onChange?: (coords: UserLocation) => void;
}> = ({ onChange }) => {
  const lastRef = useRef<UserLocation | null>(null);
  const map = useMapEvents({
    moveend() {
      const center = map.getCenter();
      const next = { lat: center.lat, lon: center.lng };
      if (lastRef.current && coordsEqual(lastRef.current, next)) return;
      lastRef.current = next;
      onChange?.(next);
    },
  });

  useEffect(() => {
    const center = map.getCenter();
    const next = { lat: center.lat, lon: center.lng };
    lastRef.current = next;
    onChange?.(next);
  }, [map, onChange]);

  return null;
};

export const MapView: FC<MapViewProps> = ({
  response,
  userLocation,
  selectedId,
  stampedIds,
  onSelect,
  onCenterChange,
}) => {
  const items = useMemo(() => response?.items ?? [], [response]);
  const radiusMeters = response?.radiusMeters;
  const legendEntries = useMemo(() => response?.categories ?? [], [response]);
  const [centerCoords, setCenterCoords] = useState<UserLocation | null>(userLocation);
  const handleCenterChange = useCallback((coords: UserLocation) => {
    setCenterCoords((prev) => (prev && coordsEqual(prev, coords) ? prev : coords));
    onCenterChange?.(coords);
  }, [onCenterChange]);

  useEffect(() => {
    if (userLocation && !coordsEqual(centerCoords ?? userLocation, userLocation)) {
      setCenterCoords(userLocation);
    }
  }, [userLocation, centerCoords]);

  if (!userLocation) {
    return (
      <div className={styles.placeholder}>
        Share your location to render the map and nearby places.
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.mapShell}>
        <MapContainer
          center={[userLocation.lat, userLocation.lon]}
          zoom={10}
          scrollWheelZoom
          className={styles.map}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CircleMarker
            center={[userLocation.lat, userLocation.lon]}
            radius={10}
            pathOptions={{
              color: '#2563eb',
              weight: 2,
              fillColor: '#1d4ed8',
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <strong>Search origin</strong>
            </Popup>
          </CircleMarker>

          {radiusMeters && radiusMeters > 0 && (
            <Circle
              center={[userLocation.lat, userLocation.lon]}
              radius={radiusMeters}
              pathOptions={{
                color: '#2563eb',
                weight: 1.5,
                dashArray: '6 6',
                fillOpacity: 0,
              }}
            />
          )}

          {items.map((item) => {
            const color = getCategoryColor(item.category.key, item.category.value);
            const placeId = getStampIdFromPlace(item);
            const isStamped = stampedIds?.has(placeId) ?? false;
            const isSelected = selectedId === placeId;

            const popupContent = (
              <Popup>
                <strong>{item.name}</strong>
                <div>{item.category.label}</div>
                <div>{formatDistance(item.distanceMeters)} away</div>
                <a href={item.osmUrl} target="_blank" rel="noreferrer">OpenStreetMap</a>
              </Popup>
            );

            if (isStamped) {
              return (
                <Marker
                  key={item.osmUrl}
                  position={[item.coordinates.latitude, item.coordinates.longitude]}
                  icon={createStampedIcon(color, isSelected)}
                  eventHandlers={{
                    click: () => onSelect?.(item),
                  }}
                >
                  {popupContent}
                </Marker>
              );
            }

            return (
              <CircleMarker
                key={item.osmUrl}
                center={[item.coordinates.latitude, item.coordinates.longitude]}
                radius={isSelected ? 10 : 8}
                pathOptions={{
                  color: isSelected ? '#0f172a' : color,
                  weight: isSelected ? 3 : 2,
                  fillColor: color,
                  fillOpacity: 0.9,
                }}
                eventHandlers={{
                  click: () => onSelect?.(item),
                }}
              >
                {popupContent}
              </CircleMarker>
            );
          })}

          <FitBounds
            userLocation={userLocation}
            items={items}
            radiusMeters={radiusMeters}
          />

          <CenterTracker
            onChange={handleCenterChange}
          />
        </MapContainer>

        <div className={styles.overlay}>
          <div className={styles.centerMarker}/>
        </div>
      </div>

      {legendEntries.length > 0 && (
        <div className={styles.legend}>
          {legendEntries.map((category) => (
            <div
              key={`${category.key}:${category.value}`}
              className={styles.legendItem}
            >
              <span
                className={styles.legendDot}
                style={{ backgroundColor: getCategoryColor(category.key, category.value) }}
              />
              <span>{category.label} ({category.count})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
