import { getProperties, getBookings, saveBookings, updateSyncStatus } from './store';
import { parseICalData } from './ical-parser';
import { Booking, Channel } from '@/types';

async function fetchIcal(url: string): Promise<string> {
  const response = await fetch('/api/ical-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.data;
}

export async function syncProperty(propertyId: string): Promise<Booking[]> {
  const properties = getProperties();
  const property = properties.find(p => p.id === propertyId);
  if (!property) throw new Error('Property not found');

  const allNewBookings: Booking[] = [];

  for (const [channel, url] of Object.entries(property.icalUrls)) {
    if (!url) continue;
    try {
      const icalData = await fetchIcal(url);
      const parsed = parseICalData(icalData, property.id, property.name, url);
      // Override channel detection with the configured channel
      parsed.forEach(b => { b.channel = channel as Channel; });
      allNewBookings.push(...parsed);
    } catch (err) {
      console.error(`Failed to sync ${channel} for ${property.name}:`, err);
    }
  }

  return allNewBookings;
}

export async function syncAllProperties(): Promise<void> {
  const properties = getProperties();
  const existingBookings = getBookings();

  // Keep manually added bookings and blocked dates
  const manualBookings = existingBookings.filter(
    b => b.channel === 'manual' || b.status === 'blocked'
  );

  const syncedBookings: Booking[] = [...manualBookings];

  for (const property of properties) {
    try {
      updateSyncStatus({
        propertyId: property.id,
        lastSync: new Date().toISOString(),
        status: 'syncing',
      });

      const newBookings = await syncProperty(property.id);
      syncedBookings.push(...newBookings);

      updateSyncStatus({
        propertyId: property.id,
        lastSync: new Date().toISOString(),
        status: 'success',
      });
    } catch (err) {
      updateSyncStatus({
        propertyId: property.id,
        lastSync: new Date().toISOString(),
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  saveBookings(syncedBookings);
}
