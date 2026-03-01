import { Booking, Channel } from '@/types';
import { v4 as uuidv4 } from 'uuid';

function detectChannel(url: string, calendarName?: string): Channel {
  const lower = (url + (calendarName || '')).toLowerCase();
  if (lower.includes('airbnb')) return 'airbnb';
  if (lower.includes('vrbo') || lower.includes('homeaway')) return 'vrbo';
  if (lower.includes('expedia') || lower.includes('hotels.com')) return 'expedia';
  return 'manual';
}

function parseDate(dateStr: string): string {
  // Handle both DATE and DATE-TIME formats
  // DATE: 20260815
  // DATE-TIME: 20260815T140000Z
  const clean = dateStr.replace(/[^0-9T]/g, '').replace('Z', '');
  if (clean.length >= 8) {
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

function unfoldLines(text: string): string {
  // iCal spec: line folding uses CRLF followed by a space or tab
  return text.replace(/\r?\n[ \t]/g, '');
}

export function parseICalData(
  icalText: string,
  propertyId: string,
  propertyName: string,
  sourceUrl: string
): Booking[] {
  const bookings: Booking[] = [];
  const unfolded = unfoldLines(icalText);
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let event: Record<string, string> = {};

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      event = {};
    } else if (line.startsWith('END:VEVENT') && inEvent) {
      inEvent = false;
      const dtStart = event['DTSTART'] || event['DTSTART;VALUE=DATE'] || '';
      const dtEnd = event['DTEND'] || event['DTEND;VALUE=DATE'] || '';
      const summary = event['SUMMARY'] || '';
      const uid = event['UID'] || uuidv4();

      if (dtStart && dtEnd) {
        const checkIn = parseDate(dtStart);
        const checkOut = parseDate(dtEnd);
        const channel = detectChannel(sourceUrl, summary);

        // Try to extract guest name from summary
        let guestName = 'Guest';
        let status: Booking['status'] = 'confirmed';

        if (summary) {
          // Common patterns: "Reserved", "Airbnb (HMXXXXXXX)", "John Smith", "Not available"
          const lowerSummary = summary.toLowerCase();
          if (lowerSummary.includes('not available') || lowerSummary.includes('blocked') || lowerSummary.includes('unavailable')) {
            status = 'blocked';
            guestName = '';
          } else if (lowerSummary === 'reserved' || lowerSummary === 'booked') {
            guestName = 'Reserved';
          } else {
            // Use summary as guest name, clean up common prefixes
            guestName = summary
              .replace(/^(Airbnb|Vrbo|VRBO|Expedia|HomeAway)\s*[-:(]?\s*/i, '')
              .replace(/\(.*?\)/g, '')
              .trim() || 'Guest';
          }
        }

        bookings.push({
          id: uuidv4(),
          propertyId,
          propertyName,
          guestName,
          checkIn,
          checkOut,
          adults: 0,
          children: 0,
          income: 0,
          currency: 'EUR',
          channel,
          status,
          uid: `${propertyId}-${uid}`,
          lastSynced: new Date().toISOString(),
        });
      }
    } else if (inEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx);
        const value = line.substring(colonIdx + 1);
        // Handle keys with parameters like DTSTART;VALUE=DATE
        event[key] = value;
        // Also store without parameters for easier lookup
        const baseKey = key.split(';')[0];
        if (baseKey !== key) {
          event[baseKey] = value;
        }
      }
    }
  }

  return bookings;
}

export function generateICalFeed(bookings: Booking[], blockedDates: { startDate: string; endDate: string; reason?: string }[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RentalChannelManager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const booking of bookings) {
    const dtStart = booking.checkIn.replace(/-/g, '');
    const dtEnd = booking.checkOut.replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `UID:${booking.uid}`,
      `SUMMARY:${booking.guestName || 'Reserved'}`,
      `DESCRIPTION:Booked via ${booking.channel}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  for (const block of blockedDates) {
    const dtStart = block.startDate.replace(/-/g, '');
    const dtEnd = block.endDate.replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `UID:blocked-${uuidv4()}`,
      `SUMMARY:${block.reason || 'Not available'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
