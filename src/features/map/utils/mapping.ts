import type { OSMElement, OSMPlace, POICategory } from '../types';

export function pickName(tags?: Record<string, string>): string {
  if (!tags) return 'Neimenovano';
  return tags['name:sl'] || tags['name:en'] || tags['name'] || 'Neimenovano';
}

export function classifyCategory(tags?: Record<string, string>): POICategory {
  const t = (s?: string) => (s ?? '').toLowerCase();
  const amenity = t(tags?.amenity);
  const building = t(tags?.building);
  const historic = t(tags?.historic);
  const man_made = t(tags?.man_made);
  const religion = t(tags?.religion);
  if (man_made === 'cross' || historic === 'wayside_cross') return 'cross';
  if (building === 'chapel') return 'chapel';
  if (building === 'church') return 'church';
  if (historic === 'monastery' || building === 'monastery' || amenity === 'monastery') return 'monastery';
  if (amenity === 'place_of_worship' || religion.includes('christ')) return 'place_of_worship';
  return 'place_of_worship';
}

export function elementToPlace(el: OSMElement): OSMPlace | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  return {
    id: `${el.type}/${el.id}`,
    name: pickName(el.tags),
    lat,
    lng: lon,
    category: classifyCategory(el.tags),
    rawTags: el.tags,
  };
}

export function bboxToOverpassQuery(bbox: L.LatLngBounds): string {
  const s = bbox.getSouth(), w = bbox.getWest(), n = bbox.getNorth(), e = bbox.getEast();
  return `
[out:json][timeout:20];
(
  node["amenity"="place_of_worship"]["religion"~"christian|catholic|orthodox|protestant",i](${s},${w},${n},${e});
  way ["amenity"="place_of_worship"]["religion"~"christian|catholic|orthodox|protestant",i](${s},${w},${n},${e});
  node["building"~"^church|chapel$",i](${s},${w},${n},${e});
  way ["building"~"^church|chapel$",i](${s},${w},${n},${e});
  node["historic"="monastery"](${s},${w},${n},${e});
  way ["historic"="monastery"](${s},${w},${n},${e});
  node["amenity"="monastery"](${s},${w},${n},${e});
  way ["amenity"="monastery"](${s},${w},${n},${e});
  node["man_made"="cross"](${s},${w},${n},${e});
  node["historic"="wayside_cross"](${s},${w},${n},${e});
);
out center;
`.trim();
}

export function bboxKey(bbox: L.LatLngBounds): string {
  const f = (x: number) => x.toFixed(4);
  return `${f(bbox.getSouth())},${f(bbox.getWest())},${f(bbox.getNorth())},${f(bbox.getEast())}`;
}
