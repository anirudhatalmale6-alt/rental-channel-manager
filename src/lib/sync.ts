import { getProperties, getBookings, saveBookings, updateSyncStatus } from './store';
import { parseICalData } from './ical-parser';
import { deduplicateBookings } from './date-utils';
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

// Merge user-edited fields from an existing booking into a freshly synced one
function mergeUserEdits(newBooking: Booking, existing: Booking): Booking {
  const merged = { ...newBooking };

  // Preserve income if user entered it
  if (existing.income > 0) merged.income = existing.income;

  // Preserve guest count if user entered it
  if (existing.adults > 0) merged.adults = existing.adults;
  if (existing.children > 0) merged.children = existing.children;

  // Preserve guest name if user changed it from a default
  const defaultNames = ['reserved', 'guest', 'not available', 'blocked', ''];
  const existingNameLower = (existing.guestName || '').toLowerCase().trim();
  if (!defaultNames.includes(existingNameLower) && !existingNameLower.startsWith('reserved -')) {
    merged.guestName = existing.guestName;
  } else if (existingNameLower.startsWith('reserved -') && merged.guestName === 'Reserved') {
    // Keep "Reserved - Name" if new parse lost the name
    merged.guestName = existing.guestName;
  }

  // Preserve checklist
  if (existing.checklist && existing.checklist.length > 0) {
    merged.checklist = existing.checklist;
  }

  // Preserve email and phone
  if (existing.email) merged.email = existing.email;
  if (existing.phone) merged.phone = existing.phone;

  return merged;
}

export async function syncAllProperties(): Promise<void> {
  const properties = getProperties();
  const existingBookings = getBookings();

  // Keep only manually added bookings (not iCal-sourced blocked entries)
  const manualBookings = existingBookings.filter(
    b => b.channel === 'manual'
  );

  // Index existing iCal bookings by property+dates for merging user edits
  const existingByKey = new Map<string, Booking>();
  existingBookings.forEach(b => {
    if (b.channel !== 'manual') {
      existingByKey.set(`${b.propertyId}|${b.checkIn}|${b.checkOut}`, b);
    }
  });

  const syncedBookings: Booking[] = [...manualBookings];

  for (const property of properties) {
    try {
      updateSyncStatus({
        propertyId: property.id,
        lastSync: new Date().toISOString(),
        status: 'syncing',
      });

      const newBookings = await syncProperty(property.id);

      // Merge user edits from existing bookings
      const mergedBookings = newBookings.map(nb => {
        const key = `${nb.propertyId}|${nb.checkIn}|${nb.checkOut}`;
        const existing = existingByKey.get(key);
        return existing ? mergeUserEdits(nb, existing) : nb;
      });

      syncedBookings.push(...mergedBookings);

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

  // Deduplicate: same property + same dates from multiple channels → keep one
  saveBookings(deduplicateBookings(syncedBookings));
}
