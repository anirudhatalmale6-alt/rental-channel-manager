'use client';
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Property, Booking } from '@/types';
import { isDateInRange, toDateString } from '@/lib/date-utils';
import { CHANNEL_COLORS } from '@/types';

interface Props {
  property: Property;
  bookings: Booking[];
  weekDates: string[];
}

export default function WeekStrip({ property, bookings, weekDates }: Props) {
  const dayStates = useMemo(() => {
    return weekDates.map(date => {
      const dayBookings = bookings.filter(
        b => b.propertyId === property.id && b.status !== 'cancelled' && isDateInRange(date, b.checkIn, b.checkOut)
      );
      return dayBookings.length > 0 ? dayBookings[0] : null;
    });
  }, [property.id, bookings, weekDates]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, py: 0.5 }}>
      <Typography
        variant="body2"
        sx={{
          width: 140,
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pr: 1,
        }}
      >
        {property.name}
      </Typography>
      <Box sx={{ display: 'flex', flex: 1, gap: 0.25 }}>
        {dayStates.map((booking, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: 28,
              borderRadius: 0.5,
              bgcolor: booking
                ? (booking.status === 'blocked' ? '#E0E0E0' : CHANNEL_COLORS[booking.channel])
                : '#F5F5F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: booking && booking.status !== 'blocked' ? '#fff' : '#999',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {new Date(weekDates[i] + 'T00:00:00').getDate()}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
