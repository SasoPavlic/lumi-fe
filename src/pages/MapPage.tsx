import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Page } from '@/components/Page.tsx';
import { Section } from '@telegram-apps/telegram-ui';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { UserIcon } from '@/features/map/utils/icons';

import { MAP_CENTER, DEFAULT_ZOOM, MIN_FETCH_ZOOM } from '@/features/map/constants';
import { POILayer } from '@/features/map/components/POILayer';
import styles from './MapPage.module.css';

// ---------- Page ----------
export const MapPage: FC = () => {
    const [userPos, setUserPos] = useState<[number, number] | undefined>(undefined);
    const [locLoading, setLocLoading] = useState(false);
    const [locError, setLocError] = useState<string | undefined>(undefined);

    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | undefined>(undefined);
    const [poiCount, setPoiCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLocLoading(true);
            setLocError(undefined);
            try {
                const tg = (window as any)?.Telegram?.WebApp;
                if (tg && typeof tg.requestLocation === 'function') {
                    const loc = await tg.requestLocation();
                    if (!cancelled && typeof loc?.latitude === 'number' && typeof loc?.longitude === 'number') {
                        setUserPos([loc.latitude, loc.longitude]);
                    }
                } else if (navigator.geolocation) {
                    await new Promise<void>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            (pos) => { if (!cancelled) setUserPos([pos.coords.latitude, pos.coords.longitude]); resolve(); },
                            (err) => reject(new Error(err.message)),
                            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
                        );
                    });
                } else {
                    throw new Error('Location is not supported on this device.');
                }
            } catch (e: any) {
                if (!cancelled) setLocError(e?.message || 'Failed to get location');
            } finally {
                if (!cancelled) setLocLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <Page>
            <div className={styles.container}>
                <div className={styles.mapWrapper}>
                    <MapContainer
                        center={MAP_CENTER}
                        zoom={DEFAULT_ZOOM}
                        className={styles.mapCanvas}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {userPos && (
                            <Marker position={userPos} icon={UserIcon}>
                                <Popup>Your location</Popup>
                            </Marker>
                        )}

                        <POILayer
                            userPos={userPos}
                            onStatus={({ fetching, error, count }) => {
                                setFetching(fetching);
                                setFetchError(error);
                                setPoiCount(count);
                            }}
                        />
                    </MapContainer>
                </div>

                <Section>
                    {locLoading && <div>Getting location…</div>}
                    {!locLoading && !userPos && (
                        <div className={styles.hint}>
                            We need your location to display nearby objects. Allow access to location in Telegram or browser.
                        </div>
                    )}
                    {locError && <div className={styles.error}>Location error: {locError}</div>}

                    {fetchError && <div className={styles.error}>Data error: {fetchError}</div>}
                    {!fetchError && fetching && <div>Loading OSM data… (zoom in if no results)</div>}
                    {!fetchError && !fetching && poiCount === 0 && (
                        <div className={styles.hint}>
                            No objects in current view (or zoom level &lt; {MIN_FETCH_ZOOM}). Zoom in or move map.
                        </div>
                    )}
                    {!fetchError && poiCount > 0 && (
                        <div className={styles.hint}>
                            Found objects in view: {poiCount}
                        </div>
                    )}
                </Section>
            </div>
        </Page>
    );
};

export default MapPage;
