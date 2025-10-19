import {
  isLocationManagerSupported,
  mountLocationManager,
  unmountLocationManager,
  requestLocation as sdkRequestLocation,
  openLocationManagerSettings,
} from '@telegram-apps/sdk';

export type TelegramLocation = {
  latitude: number;
  longitude: number;
  altitude?: number;
  course?: number;
  speed?: number;
  horizontal_accuracy?: number;
  vertical_accuracy?: number;
  course_accuracy?: number;
  speed_accuracy?: number;
};

export function isSupported(): boolean {
  try { return isLocationManagerSupported(); } catch { return false; }
}

export async function safeMount(): Promise<boolean> {
  if (!isSupported()) return false;
  if (!mountLocationManager.isAvailable()) return false;
  try {
    await mountLocationManager();
    return true;
  } catch {
    return false;
  }
}

export function safeUnmount(): void {
  try { unmountLocationManager(); } catch { /* noop */ }
}

export async function requestLocation(): Promise<TelegramLocation> {
  if (!isSupported() || !sdkRequestLocation.isAvailable()) throw new Error('Telegram LocationManager is not available');
  return sdkRequestLocation();
}

export function openSettings(): void {
  if (openLocationManagerSettings.isAvailable()) {
    openLocationManagerSettings();
  }
}
