import { NextRequest, NextResponse } from 'next/server';

// This endpoint serves the iCal feed for a property
// The actual data is generated client-side and passed to this endpoint
// In production, this would read from a database
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;

  // For now, return a basic calendar
  // In the full version, this reads from stored bookings + blocked dates
  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//RentalChannelManager//Property ${propertyId}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="property-${propertyId}.ics"`,
    },
  });
}
