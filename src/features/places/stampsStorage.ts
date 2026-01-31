import type { PlacesItem } from './types.ts';

const STORAGE_KEY = 'lumigram:stamps:v1';
const OSM_ID_PATTERN = /(node|way|relation)\/(\d+)/i;

type StoredStamps = {
  ids: string[];
  updatedAt: string;
};

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getStampIdFromPlace(place: PlacesItem): string {
  return getStampIdFromOsmUrl(place.osmUrl);
}

export function getStampIdFromOsmUrl(osmUrl: string): string {
  const match = osmUrl.match(OSM_ID_PATTERN);
  if (match) {
    return `${match[1].toLowerCase()}/${match[2]}`;
  }
  return osmUrl;
}

export function loadStampedIds(): Set<string> {
  if (!hasStorage()) return new Set<string>();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as StoredStamps;
    if (!parsed || !Array.isArray(parsed.ids)) return new Set<string>();
    return new Set<string>(parsed.ids);
  } catch {
    return new Set<string>();
  }
}

export function persistStampedIds(ids: Set<string>): void {
  if (!hasStorage()) return;
  const payload: StoredStamps = {
    ids: Array.from(ids),
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors for MVP (private mode, quota, etc.).
  }
}

