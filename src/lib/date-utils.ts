export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfWeek(year: number, month: number): number {
  // 0 = Monday (ISO), adjust from JS Sunday=0
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date < end;
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn + 'T00:00:00');
  const d2 = new Date(checkOut + 'T00:00:00');
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export function getMonthName(month: number): string {
  return new Date(2026, month, 1).toLocaleDateString('en-US', { month: 'long' });
}

// Lighten a hex color by mixing with white (amount 0-1, higher = lighter)
export function lightenColor(hex: string, amount: number = 0.5): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * amount);
  const g = Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * amount);
  const b = Math.round((num & 255) + (255 - (num & 255)) * amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Deduplicate bookings: remove blocked entries that overlap with confirmed bookings on the same property
// Also removes exact duplicates (same property + same dates)
export function deduplicateBookings<T extends { propertyId: string; checkIn: string; checkOut: string; status: string }>(bookings: T[]): T[] {
  // First pass: exact dedup (same property + dates), prefer confirmed over blocked
  const seen = new Map<string, T>();
  for (const b of bookings) {
    const key = `${b.propertyId}|${b.checkIn}|${b.checkOut}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, b);
    } else if (existing.status === 'blocked' && b.status !== 'blocked') {
      seen.set(key, b);
    }
  }
  const deduped = Array.from(seen.values());

  // Second pass: remove blocked entries that overlap with a confirmed booking on the same property
  // (e.g., Airbnb exports "Not available" with +1 day when Vrbo has the actual booking)
  const confirmed = deduped.filter(b => b.status !== 'blocked');
  return deduped.filter(b => {
    if (b.status !== 'blocked') return true;
    // Check if any confirmed booking on the same property overlaps this blocked entry
    const hasOverlap = confirmed.some(c =>
      c.propertyId === b.propertyId &&
      c.checkIn < b.checkOut && c.checkOut > b.checkIn
    );
    return !hasOverlap;
  });
}

export function getWeekDates(year: number, month: number, weekStart: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(toDateString(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return dates;
}
