import type { FC } from 'react';
import { useEffect, useMemo } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { latLngBounds, type LatLngExpression } from 'leaflet';

import { getCategoryColor } from '@/features/places/constants.ts';
import type {
  PlacesItem,
  PlacesOfWorshipResponse,
  UserLocation,
} from '@/features/places/types.ts';

import styles from './MapView.module.css';

interface MapViewProps {
  response: PlacesOfWorshipResponse | null;
  userLocation: UserLocation | null;
}

const EARTH_RADIUS_METERS = 6_371_000;

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

export const MapView: FC<MapViewProps> = ({ response, userLocation }) => {
  if (!userLocation) {
    return (
      <div className={styles.placeholder}>
        Share your location to render the map and nearby places.
      </div>
    );
  }

  const items = useMemo(() => response?.items ?? [], [response]);
  const radiusMeters = response?.radiusMeters;
  const legendEntries = useMemo(() => response?.categories ?? [], [response]);

  return (
    <div className={styles.wrapper}>
      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={10}
        scrollWheelZoom={false}
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
            <strong>You are here</strong>
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
          return (
            <CircleMarker
              key={item.osmUrl}
              center={[item.coordinates.latitude, item.coordinates.longitude]}
              radius={8}
              pathOptions={{
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <strong>{item.name}</strong>
                <div>{item.category.label}</div>
                <div>{formatDistance(item.distanceMeters)} away</div>
                <a href={item.osmUrl} target="_blank" rel="noreferrer">OpenStreetMap</a>
              </Popup>
            </CircleMarker>
          );
        })}

        <FitBounds
          userLocation={userLocation}
          items={items}
          radiusMeters={radiusMeters}
        />
      </MapContainer>

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
