import type {
  ApiErrorPayload,
  ClosestPoiRequest,
  PlacesOfWorshipResponse,
} from './types.ts';

const API_PATH = '/api/closest-poi';
const FALLBACK_ORIGIN = 'http://localhost:4000';

export function getApiBaseUrl(): string {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBase) {
    return configuredBase.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return FALLBACK_ORIGIN;
}

function resolveApiUrl(searchParams: URLSearchParams): string {
  const normalizedPath = API_PATH.startsWith('/') ? API_PATH.slice(1) : API_PATH;
  const base = getApiBaseUrl();
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const url = new URL(normalizedPath, normalizedBase);
  url.search = searchParams.toString();
  return url.toString();
}

export async function fetchClosestPoi(
  { lat, lon, radiusKm, signal }: ClosestPoiRequest,
): Promise<PlacesOfWorshipResponse> {
  const searchParams = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radiusKm: String(radiusKm),
  });

  const endpoint = resolveApiUrl(searchParams);
  let res: Response;

  try {
    res = await fetch(endpoint, { signal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error.';
    throw new Error(`Unable to reach the Places API at ${getApiBaseUrl()}. ${message}`);
  }

  if (!res.ok) {
    let message = 'Unable to retrieve nearby places of worship.';
    try {
      const body = await res.json() as ApiErrorPayload;
      if (body?.message) {
        message = body.message;
      }
    } catch {
      // Ignore JSON parse errors to keep the default message.
    }
    throw new Error(`${message} (API: ${getApiBaseUrl()}, HTTP ${res.status})`);
  }

  return res.json() as Promise<PlacesOfWorshipResponse>;
}
