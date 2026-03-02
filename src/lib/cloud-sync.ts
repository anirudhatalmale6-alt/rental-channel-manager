// Client-side cloud sync — pushes/pulls data via /api/data
import { Property, Booking, BlockedDate } from '@/types';

interface CloudData {
  properties: Property[];
  bookings: Booking[];
  blockedDates: BlockedDate[];
  lastUpdated: string;
}

const CLOUD_TIMESTAMP_KEY = 'rcm_cloud_last_sync';

export async function loadFromCloud(): Promise<CloudData | null> {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data as CloudData;
  } catch {
    return null;
  }
}

export async function pushToCloud(
  properties: Property[],
  bookings: Booking[],
  blockedDates: BlockedDate[]
): Promise<boolean> {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties, bookings, blockedDates }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof window !== 'undefined' && data.lastUpdated) {
        localStorage.setItem(CLOUD_TIMESTAMP_KEY, data.lastUpdated);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Debounced push — waits 2 seconds after last call before actually pushing
let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePush(
  properties: Property[],
  bookings: Booking[],
  blockedDates: BlockedDate[]
) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushToCloud(properties, bookings, blockedDates);
  }, 2000);
}
