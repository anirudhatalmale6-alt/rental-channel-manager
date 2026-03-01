'use client';
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import { Property, Booking, CHANNEL_COLORS } from '@/types';
import { getDaysInMonth, toDateString, isDateInRange, getMonthName, formatDate } from '@/lib/date-utils';
import ChannelIcon from './ChannelIcon';

interface Props {
  year: number;
  month: number;
  properties: Property[];
  bookings: Booking[];
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MultiPropertyMonth({ year, month, properties, bookings, onMonthChange }: Props) {
  const daysInMonth = getDaysInMonth(year, month);
  const monthStart = toDateString(year, month, 1);
  const monthEnd = toDateString(year, month, daysInMonth);

  // Build day numbers array for header
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return {
        day: i + 1,
        weekday: WEEKDAYS[d.getDay()],
        dateStr: toDateString(year, month, i + 1),
      };
    });
  }, [year, month, daysInMonth]);

  // For each property, get the booking state per day
  const propertyDayStates = useMemo(() => {
    return properties.map(prop => {
      const propBookings = bookings.filter(b => b.propertyId === prop.id && b.status !== 'cancelled');
      return days.map(d => {
        const dayBooking = propBookings.find(b => isDateInRange(d.dateStr, b.checkIn, b.checkOut));
        return dayBooking || null;
      });
    });
  }, [properties, bookings, days]);

  // Occupancies for this month only: bookings that overlap with this month
  const monthOccupancies = useMemo(() => {
    return bookings
      .filter(b => {
        if (b.status === 'cancelled' || b.status === 'blocked') return false;
        // Booking overlaps with month if checkIn < monthEnd+1 AND checkOut > monthStart
        const nextMonth = month === 11 ? toDateString(year + 1, 0, 1) : toDateString(year, month + 1, 1);
        return b.checkIn < nextMonth && b.checkOut > monthStart;
      })
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }, [bookings, year, month, monthStart]);

  const handlePrev = () => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  };

  const handleNext = () => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  };

  return (
    <Box>
      {/* Month header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={handlePrev} size="small"><ChevronLeftIcon /></IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{getMonthName(month)} {year}</Typography>
        <IconButton onClick={handleNext} size="small"><ChevronRightIcon /></IconButton>
      </Box>

      {/* Calendar strip card */}
      <Card sx={{ mb: 2, overflow: 'hidden' }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, overflowX: 'auto' }}>
          {/* Day headers */}
          <Box sx={{ display: 'flex', mb: 0.5, minWidth: days.length * 26 + 120 }}>
            <Box sx={{ width: 120, flexShrink: 0 }} />
            {days.map(d => (
              <Box key={d.day} sx={{ width: 26, flexShrink: 0, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 9, color: '#999', lineHeight: 1.2 }}>{d.weekday}</Typography>
                <Typography sx={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>{d.day}</Typography>
              </Box>
            ))}
          </Box>

          {/* Property rows */}
          {properties.map((prop, pi) => (
            <Box key={prop.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5, minWidth: days.length * 26 + 120 }}>
              <Typography
                variant="body2"
                sx={{
                  width: 120,
                  flexShrink: 0,
                  fontWeight: 500,
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  pr: 1,
                }}
              >
                {prop.name}
              </Typography>
              <Box sx={{ display: 'flex' }}>
                {propertyDayStates[pi].map((booking, di) => (
                  <Box
                    key={di}
                    sx={{
                      width: 26,
                      height: 24,
                      flexShrink: 0,
                      bgcolor: booking
                        ? (booking.status === 'blocked' ? '#E0E0E0' : (CHANNEL_COLORS[booking.channel] || '#1976D2'))
                        : '#F5F5F5',
                      borderRight: '1px solid #fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: booking && booking.status !== 'blocked' ? '#fff' : '#ccc',
                      fontSize: 9,
                      fontWeight: 600,
                    }}
                  >
                    {days[di].day}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Occupancies for this month */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#666' }}>
        Occupancies ({getMonthName(month)} {year})
      </Typography>

      {monthOccupancies.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" sx={{ color: '#999' }}>No reservations this month</Typography>
          </CardContent>
        </Card>
      ) : (
        monthOccupancies.map(booking => (
          <Card key={booking.id} sx={{ mb: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <ChannelIcon channel={booking.channel} size="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{booking.propertyName}</Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#444' }}>
                  {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#888' }}>
                  {booking.guestName}
                </Typography>
              </Box>
              <ChevronRightOutlinedIcon sx={{ color: '#ccc' }} />
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
}
