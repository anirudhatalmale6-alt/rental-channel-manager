import { Property, Booking, BlockedDate, SyncStatus, PROPERTY_COLORS } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEYS = {
  properties: 'rcm_properties',
  bookings: 'rcm_bookings',
  blockedDates: 'rcm_blocked_dates',
  syncStatus: 'rcm_sync_status',
};

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Properties
export function getProperties(): Property[] {
  const props = getItem<Property[]>(STORAGE_KEYS.properties, []);
  // Ensure property colors match the current palette
  let updated = false;
  props.forEach((p, i) => {
    const expectedColor = PROPERTY_COLORS[i % PROPERTY_COLORS.length];
    if (p.color !== expectedColor) {
      p.color = expectedColor;
      updated = true;
    }
  });
  if (updated) {
    setItem(STORAGE_KEYS.properties, props);
  }
  return props;
}

export function saveProperty(property: Omit<Property, 'id' | 'createdAt' | 'color'>): Property {
  const properties = getProperties();
  const newProp: Property = {
    ...property,
    id: uuidv4(),
    color: PROPERTY_COLORS[properties.length % PROPERTY_COLORS.length],
    createdAt: new Date().toISOString(),
  };
  properties.push(newProp);
  setItem(STORAGE_KEYS.properties, properties);
  return newProp;
}

export function updateProperty(id: string, updates: Partial<Property>): Property | null {
  const properties = getProperties();
  const idx = properties.findIndex(p => p.id === id);
  if (idx === -1) return null;
  properties[idx] = { ...properties[idx], ...updates };
  setItem(STORAGE_KEYS.properties, properties);
  return properties[idx];
}

export function deleteProperty(id: string) {
  const properties = getProperties().filter(p => p.id !== id);
  setItem(STORAGE_KEYS.properties, properties);
  // Also remove related bookings and blocked dates
  const bookings = getBookings().filter(b => b.propertyId !== id);
  setItem(STORAGE_KEYS.bookings, bookings);
  const blocked = getBlockedDates().filter(b => b.propertyId !== id);
  setItem(STORAGE_KEYS.blockedDates, blocked);
}

// Bookings
export function getBookings(): Booking[] {
  return getItem<Booking[]>(STORAGE_KEYS.bookings, []);
}

export function getBookingsForProperty(propertyId: string): Booking[] {
  return getBookings().filter(b => b.propertyId === propertyId);
}

export function saveBookings(bookings: Booking[]) {
  setItem(STORAGE_KEYS.bookings, bookings);
}

export function upsertBooking(booking: Booking) {
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.uid === booking.uid);
  if (idx >= 0) {
    bookings[idx] = { ...bookings[idx], ...booking, lastSynced: new Date().toISOString() };
  } else {
    bookings.push({ ...booking, lastSynced: new Date().toISOString() });
  }
  setItem(STORAGE_KEYS.bookings, bookings);
}

export function removeBooking(id: string) {
  const bookings = getBookings().filter(b => b.id !== id);
  setItem(STORAGE_KEYS.bookings, bookings);
}

// Blocked Dates
export function getBlockedDates(): BlockedDate[] {
  return getItem<BlockedDate[]>(STORAGE_KEYS.blockedDates, []);
}

export function addBlockedDate(block: Omit<BlockedDate, 'id'>): BlockedDate {
  const blocked = getBlockedDates();
  const newBlock: BlockedDate = { ...block, id: uuidv4() };
  blocked.push(newBlock);
  setItem(STORAGE_KEYS.blockedDates, blocked);
  return newBlock;
}

export function removeBlockedDate(id: string) {
  const blocked = getBlockedDates().filter(b => b.id !== id);
  setItem(STORAGE_KEYS.blockedDates, blocked);
}

// Sync Status
export function getSyncStatuses(): SyncStatus[] {
  return getItem<SyncStatus[]>(STORAGE_KEYS.syncStatus, []);
}

export function updateSyncStatus(status: SyncStatus) {
  const statuses = getSyncStatuses();
  const idx = statuses.findIndex(s => s.propertyId === status.propertyId);
  if (idx >= 0) {
    statuses[idx] = status;
  } else {
    statuses.push(status);
  }
  setItem(STORAGE_KEYS.syncStatus, statuses);
}
