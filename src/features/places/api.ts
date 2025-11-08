import type {
  ApiErrorPayload,
  ClosestPoiRequest,
  PlacesOfWorshipResponse,
} from './types.ts';

const API_PATH = '/api/closest-poi';

function resolveApiUrl(searchParams: URLSearchParams): string {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  const normalizedPath = API_PATH.startsWith('/') ? API_PATH.slice(1) : API_PATH;

  if (configuredBase) {
    const base = configuredBase.endsWith('/')
      ? configuredBase
      : `${configuredBase}/`;
    const url = new URL(normalizedPath, base);
    url.search = searchParams.toString();
    return url.toString();
  }

  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:3000';
  const url = new URL(API_PATH, origin);
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

  const res = await fetch(resolveApiUrl(searchParams), { signal });

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
    throw new Error(message);
  }

  return res.json() as Promise<PlacesOfWorshipResponse>;
}
