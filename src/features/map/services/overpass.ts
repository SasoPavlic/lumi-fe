import type { OSMElement, OSMPlace } from '../types';
import { OVERPASS_ENDPOINTS } from '../constants';
import { elementToPlace } from '../utils/mapping';

export async function fetchOverpass(query: string, signal: AbortSignal): Promise<OSMPlace[]> {
  const form = new URLSearchParams(); form.set('data', query);
  let lastErr: any = null;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: form.toString(),
        signal,
      });
      if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
      const data = await res.json();
      const elements: OSMElement[] = Array.isArray(data?.elements) ? data.elements : [];
      const uniq = new Map<string, OSMPlace>();
      for (const el of elements) {
        const p = elementToPlace(el);
        if (p) uniq.set(p.id, p);
      }
      return Array.from(uniq.values());
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('All Overpass endpoints failed');
}
