import { NextRequest, NextResponse } from 'next/server';
import { readData } from '@/lib/github-db';
import { Booking, BlockedDate } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;

  try {
    const { data } = await readData();
    const properties = data.properties as Array<{ id: string; name: string }>;
    const property = properties.find(p => p.id === propertyId);

    if (!property) {
      return new NextResponse('Property not found', { status: 404 });
    }

    // ?for=vrbo excludes vrbo-sourced bookings (so VRBO doesn't see its own bookings back)
    // ?for=airbnb excludes airbnb-sourced bookings (same logic)
    const forPlatform = request.nextUrl.searchParams.get('for')?.toLowerCase();

    // Get bookings and blocked dates for this property
    let bookings = (data.bookings as Booking[]).filter(
      b => b.propertyId === propertyId && b.status !== 'cancelled'
    );

    // Exclude bookings that originated from the target platform
    if (forPlatform) {
      bookings = bookings.filter(b => b.channel !== forPlatform);
    }

    const blockedDates = (data.blockedDates as BlockedDate[]).filter(
      b => b.propertyId === propertyId
    );

    // Generate iCal feed
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//KerlaretRentals//${property.name}//EN`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${property.name}`,
    ];

    // Add bookings as events
    for (const booking of bookings) {
      const dtStart = booking.checkIn.replace(/-/g, '');
      const dtEnd = booking.checkOut.replace(/-/g, '');
      lines.push(
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `UID:${booking.uid || booking.id}@kerlaret-rentals`,
        `SUMMARY:${booking.status === 'blocked' ? 'Not available' : (booking.guestName || 'Reserved')}`,
        'STATUS:CONFIRMED',
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
        'END:VEVENT'
      );
    }

    // Add blocked dates as "Not available" events
    for (const block of blockedDates) {
      const dtStart = block.startDate.replace(/-/g, '');
      const dtEnd = block.endDate.replace(/-/g, '');
      lines.push(
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `UID:blocked-${block.id}@kerlaret-rentals`,
        `SUMMARY:Not available`,
        `DESCRIPTION:${block.reason || 'Blocked via Kerlaret Rentals'}`,
        'STATUS:CONFIRMED',
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');
    const ical = lines.join('\r\n');

    return new NextResponse(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${property.name.replace(/\s+/g, '-')}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(`Error: ${message}`, { status: 500 });
  }
}
