import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { Page } from '@/components/Page.tsx';
import { Section, Button } from '@telegram-apps/telegram-ui';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons when bundling with Vite
// Use CDN assets to avoid additional local files configuration
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const SLOVENIA_CENTER: [number, number] = [46.1512, 14.9955];
const ZOOM = 7;

const LJUBLJANA: [number, number] = [46.0569, 14.5058];
const MARIBOR: [number, number] = [46.5547, 15.6459];

const NAMES = ['Alban', 'Luka', 'Reyan', 'Miha', 'Hamza', 'Janez', 'Neo', 'Eon', 'Ion'];

export const SloveniaMapPage: FC = () => {
  const [nameIndex, setNameIndex] = useState(0);
  const [color, setColor] = useState<string>('#007AFF');
  const [clicked, setClicked] = useState(false);

  const currentName = NAMES[nameIndex % NAMES.length];

  const randomColor = () => {
    // Pleasant random color
    const h = Math.floor(Math.random() * 360);
    const s = 65 + Math.floor(Math.random() * 20); // 65-85
    const l = 45 + Math.floor(Math.random() * 10); // 45-55
    return `hsl(${h} ${s}% ${l}%)`;
  };

  const onClick = () => {
    setClicked(true);
    setColor(randomColor());
    setNameIndex((i) => (i + 1) % NAMES.length);
  };

  // Prevent SSR/TS issues with window during styles calc
  const mapStyle = useMemo(() => ({ height: '66vh', width: '100%' }), []);

  return (
    <Page>
      <div style={{ padding: 12 }}>
        <div style={mapStyle}>
          <MapContainer center={SLOVENIA_CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={LJUBLJANA}>
              <Popup>Ljubljana</Popup>
            </Marker>
            <Marker position={MARIBOR}>
              <Popup>Maribor</Popup>
            </Marker>
          </MapContainer>
        </div>

        <Section>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button onClick={onClick} style={{ backgroundColor: color, color: '#fff' }}>
              {!clicked ? 'Klikni me Dinči!!!' : `Ime mojega sina bo: ${currentName}`}
            </Button>
          </div>
        </Section>
      </div>
    </Page>
  );
};

export default SloveniaMapPage;
