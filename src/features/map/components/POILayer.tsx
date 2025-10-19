import { useEffect, useRef, useState } from 'react';
import { Marker, Popup, useMap, useMapEvent } from 'react-leaflet';
import L from 'leaflet';
import type { OSMPlace } from '../types';
import { MIN_FETCH_ZOOM, REQUEST_TIMEOUT_MS } from '../constants';
import { bboxKey, bboxToOverpassQuery } from '../utils/mapping';
import { withTimeout } from '../utils/network';
import { fetchOverpass } from '../services/overpass';
import { ChapelIcon, ChurchIcon, CrossIcon, GenericWorshipIcon, MonasteryIcon } from '../utils/icons';

export interface POILayerStatus { fetching: boolean; error?: string; count: number }

export function POILayer({
  userPos,
  onStatus,
}: {
  userPos?: [number, number];
  onStatus?: (s: POILayerStatus) => void;
}) {
  const map = useMap();
  const [pois, setPois] = useState<OSMPlace[]>([]);
  const cacheRef = useRef<Map<string, OSMPlace[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const report = (fetching: boolean, error?: string) => {
    onStatus?.({ fetching, error, count: error ? 0 : pois.length });
  };

  const load = () => {
    const zoom = map.getZoom();
    if (zoom < MIN_FETCH_ZOOM) { setPois([]); report(false); return; }
    const bbox = map.getBounds();
    const key = bboxKey(bbox);

    if (cacheRef.current.has(key)) {
      const cached = cacheRef.current.get(key)!;
      setPois(cached);
      onStatus?.({ fetching: false, error: undefined, count: cached.length });
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    onStatus?.({ fetching: true, error: undefined, count: pois.length });
    const query = bboxToOverpassQuery(bbox);

    withTimeout(fetchOverpass(query, abort.signal), REQUEST_TIMEOUT_MS, abort)
      .then(results => {
        cacheRef.current.set(key, results);
        setPois(results);
        onStatus?.({ fetching: false, error: undefined, count: results.length });
      })
      .catch(e => {
        onStatus?.({ fetching: false, error: e?.message || 'Error fetching data', count: 0 });
      })
      .finally(() => {
        if (abortRef.current === abort) abortRef.current = null;
      });
  };

  useMapEvent('moveend', () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(load, 350);
  });
  useMapEvent('zoomend', () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(load, 150);
  });

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current) return;
    if (!userPos || pois.length === 0) return;
    const b = L.latLngBounds([userPos]);
    pois.forEach(p => b.extend([p.lat, p.lng]));
    map.fitBounds(b.pad(0.2), { animate: true });
    didFit.current = true;
  }, [map, userPos, pois]);

  return (
    <>
      {pois.map((p) => {
        let iconToUse = GenericWorshipIcon;
        switch (p.category) {
          case 'church': iconToUse = ChurchIcon; break;
          case 'chapel': iconToUse = ChapelIcon; break;
          case 'monastery': iconToUse = MonasteryIcon; break;
          case 'cross': iconToUse = CrossIcon; break;
          case 'place_of_worship': iconToUse = GenericWorshipIcon; break;
          default: iconToUse = GenericWorshipIcon;
        }
        return (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={iconToUse}>
            <Popup>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {p.category}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
