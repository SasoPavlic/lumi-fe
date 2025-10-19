import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Page } from '@/components/Page.tsx';
import { Button, Section } from '@telegram-apps/telegram-ui';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { UserIcon } from '@/features/map/utils/icons';

import { MAP_CENTER, DEFAULT_ZOOM, MIN_FETCH_ZOOM } from '@/features/map/constants';
import { POILayer } from '@/features/map/components/POILayer';
import { useTelegramLocation } from '@/features/telegram/useTelegramLocation';
import styles from './MapPage.module.css';

const CenterOnUser: FC<{ pos?: [number, number] }> = ({ pos }) => {
    const map = useMap();
    const didCenterRef = useRef(false);
    useEffect(() => {
        if (!pos || didCenterRef.current) return;
        const targetZoom = Math.max(map.getZoom(), 13);
        map.setView(pos, targetZoom, { animate: true });
        didCenterRef.current = true;
    }, [map, pos]);
    return null;
};

// ---------- Page ----------
export const MapPage: FC = () => {
    const { supported: tgSupported, loading: locLoading, error: locError, coords, openSettings } = useTelegramLocation();
    const userPos = coords ? [coords.lat, coords.lng] as [number, number] : undefined;

    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | undefined>(undefined);
    const [poiCount, setPoiCount] = useState(0);

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

                        <CenterOnUser pos={userPos} />

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
                    <div aria-live="polite">
                        {locLoading && <div>Getting location…</div>}
                        {!locLoading && !userPos && (
                            <div className={styles.hint}>
                                We need your location to display nearby objects. Allow access to location in Telegram or browser.
                            </div>
                        )}
                        {locError && <div className={styles.error}>Location error: {locError}</div>}
                        {tgSupported && (
                            <div style={{ marginTop: 8 }}>
                                <Button size="s" mode="bezeled" disabled={locLoading} onClick={() => openSettings()}>
                                    Location settings
                                </Button>
                            </div>
                        )}
                    </div>

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
