export type POICategory = 'church' | 'chapel' | 'monastery' | 'cross' | 'place_of_worship';

export interface OSMElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OSMPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: POICategory;
  rawTags?: Record<string, string>;
}
