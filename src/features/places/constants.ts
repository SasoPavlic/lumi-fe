export const DEFAULT_RADIUS_KM = 10;
export const MIN_RADIUS_KM = 0;
export const MAX_RADIUS_KM = 100;

const CATEGORY_COLORS: Record<string, string> = {
  'amenity:place_of_worship': '#6366f1',
  'historic:wayside_shrine': '#f97316',
  'historic:wayside_cross': '#facc15',
  'building:chapel': '#22c55e',
};

const FALLBACK_CATEGORY_COLOR = '#ef4444';

export function getCategoryColor(key: string, value: string): string {
  return CATEGORY_COLORS[`${key}:${value}`] ?? FALLBACK_CATEGORY_COLOR;
}
