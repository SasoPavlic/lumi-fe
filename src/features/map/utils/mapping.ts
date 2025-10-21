import type { OSMElement, OSMPlace, POICategory } from '../types';

export function pickName(tags?: Record<string, string>): string {
    if (!tags) return 'Neimenovano';
    return tags['name:sl'] || tags['name:en'] || tags['name'] || 'Neimenovano';
}

export function classifyCategory(_: Record<string, string> | undefined): POICategory {
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
    const s = bbox.getSouth();
    const w = bbox.getWest();
    const n = bbox.getNorth();
    const e = bbox.getEast();

    return `
[out:json][timeout:20];
(
  node["amenity"="place_of_worship"]["religion"](${s},${w},${n},${e});
  way["amenity"="place_of_worship"]["religion"](${s},${w},${n},${e});
  relation["amenity"="place_of_worship"]["religion"](${s},${w},${n},${e});
);
out center;
`.trim();
}

export function bboxKey(bbox: L.LatLngBounds): string {
    const f = (x: number) => x.toFixed(4);
    return `${f(bbox.getSouth())},${f(bbox.getWest())},${f(bbox.getNorth())},${f(bbox.getEast())}`;
}
