export interface PlacesCategory {
  key: string;
  value: string;
  label: string;
  count: number;
}

export interface PlacesItem {
  name: string;
  distanceMeters: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  osmUrl: string;
  tags: Record<string, string>;
  category: {
    key: string;
    value: string;
    label: string;
  };
}

export interface PlacesOfWorshipResponse {
  radiusMeters: number;
  count: number;
  source: 'openstreetmap-overpass' | string;
  categories: PlacesCategory[];
  items: PlacesItem[];
}

export interface ClosestPoiRequest {
  lat: number;
  lon: number;
  radiusKm: number;
  signal?: AbortSignal;
}

export interface ApiErrorPayload {
  statusCode: number;
  message: string;
}

export interface UserLocation {
  lat: number;
  lon: number;
}
