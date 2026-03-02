'use client';
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Property, Booking } from '@/types';
import { isDateInRange, lightenColor } from '@/lib/date-utils';

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
      if (dayBookings.length === 0) return null;
      // Prioritize confirmed bookings over blocked
      const confirmed = dayBookings.find(b => b.status !== 'blocked');
      return confirmed || dayBookings[0];
    });
  }, [property.id, bookings, weekDates]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, py: 0.5 }}>
      <Box
        sx={{
          width: 140,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          pr: 1,
        }}
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: property.color, flexShrink: 0 }} />
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 12,
          }}
        >
          {property.name}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flex: 1, gap: 0.25 }}>
        {dayStates.map((booking, i) => {
          const isOccupied = booking && booking.status !== 'blocked';
          const isBlocked = booking && booking.status === 'blocked';
          return (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: 28,
                borderRadius: 0.5,
                bgcolor: isOccupied
                  ? property.color
                  : isBlocked
                    ? lightenColor(property.color, 0.55)
                    : '#F5F5F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isOccupied ? '#fff' : '#999',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {new Date(weekDates[i] + 'T00:00:00').getDate()}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
