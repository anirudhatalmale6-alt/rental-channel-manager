'use client';
import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import { Property, Booking } from '@/types';
import { isDateInRange, formatDate, lightenColor, deduplicateBookings } from '@/lib/date-utils';
import ChannelIcon from './ChannelIcon';

interface Props {
  year: number;
  month: number;
  properties: Property[];
  bookings: Booking[];
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VISIBLE_DAYS = 10; // Number of day columns visible at once
const SCROLL_STEP = 7;   // Scroll by 7 days (one week)
const CELL_W = 32;        // Width of each day cell

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MultiPropertyMonth({ year, month, properties, bookings, onMonthChange }: Props) {
  const [startIdx, setStartIdx] = useState(0);

  // Build all days in the month
  const days = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return {
        day: i + 1,
        weekday: WEEKDAYS_SHORT[d.getDay()],
        dateStr: toDateStr(d),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: toDateStr(d) === toDateStr(new Date()),
      };
    });
  }, [year, month]);

  // Reset startIdx when month changes
  useMemo(() => { setStartIdx(0); }, [year, month]);

  // Visible window of days
  const visibleDays = days.slice(startIdx, startIdx + VISIBLE_DAYS);
  const canScrollLeft = startIdx > 0;
  const canScrollRight = startIdx + VISIBLE_DAYS < days.length;

  // For each property, get the booking state per visible day
  const propertyDayStates = useMemo(() => {
    return properties.map(prop => {
      const propBookings = bookings.filter(b => b.propertyId === prop.id && b.status !== 'cancelled');
      return visibleDays.map(d => {
        const matching = propBookings.filter(b => isDateInRange(d.dateStr, b.checkIn, b.checkOut));
        if (matching.length === 0) return null;
        // Prioritize confirmed bookings over blocked
        const confirmed = matching.find(b => b.status !== 'blocked');
        return confirmed || matching[0];
      });
    });
  }, [properties, bookings, visibleDays]);

  // Occupancies for visible days only (not the whole month)
  const visibleOccupancies = useMemo(() => {
    if (visibleDays.length === 0) return [];
    const rangeStart = visibleDays[0].dateStr;
    // rangeEnd is the day AFTER the last visible day (for checkOut comparison)
    const lastDay = visibleDays[visibleDays.length - 1];
    const endDate = new Date(year, month, lastDay.day + 1);
    const rangeEnd = toDateStr(endDate);
    const filtered = bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      // Booking overlaps visible range if checkIn < rangeEnd AND checkOut > rangeStart
      return b.checkIn < rangeEnd && b.checkOut > rangeStart;
    });
    return deduplicateBookings(filtered).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }, [bookings, visibleDays, year, month]);

  const handleScrollLeft = () => {
    setStartIdx(Math.max(0, startIdx - SCROLL_STEP));
  };

  const handleScrollRight = () => {
    setStartIdx(Math.min(days.length - VISIBLE_DAYS, startIdx + SCROLL_STEP));
  };

  const handlePrevMonth = () => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  };

  const stripWidth = visibleDays.length * CELL_W;

  return (
    <Box>
      {/* Month selector */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1.5, gap: 1 }}>
        <IconButton onClick={handlePrevMonth} size="small"><ChevronLeftIcon /></IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 140, textAlign: 'center' }}>
          {MONTH_NAMES[month]} {year}
        </Typography>
        <IconButton onClick={handleNextMonth} size="small"><ChevronRightIcon /></IconButton>
      </Box>

      {/* Calendar strip card */}
      <Card sx={{ mb: 2, overflow: 'hidden' }}>
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          {/* Day scroll arrows + header */}
          <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
            {/* Left panel: empty space above property names + left arrow */}
            <Box sx={{ width: 110, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              {/* Arrow row aligned with day headers */}
              <Box sx={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 0.5 }}>
                <IconButton
                  onClick={handleScrollLeft}
                  disabled={!canScrollLeft}
                  size="small"
                  sx={{ p: 0.3 }}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Right panel: day columns */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {/* Day headers with right arrow */}
              <Box sx={{ display: 'flex', alignItems: 'center', height: 36 }}>
                <Box sx={{ display: 'flex' }}>
                  {visibleDays.map(d => (
                    <Box
                      key={d.day}
                      sx={{
                        width: CELL_W,
                        flexShrink: 0,
                        textAlign: 'center',
                        bgcolor: d.isToday ? '#E3F2FD' : 'transparent',
                        borderRadius: 1,
                      }}
                    >
                      <Typography sx={{ fontSize: 9, color: d.isWeekend ? '#E91E63' : '#999', lineHeight: 1.2 }}>
                        {d.weekday}
                      </Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: d.isToday ? 700 : 600, lineHeight: 1.2, color: d.isToday ? '#1976D2' : 'inherit' }}>
                        {d.day}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <IconButton
                  onClick={handleScrollRight}
                  disabled={!canScrollRight}
                  size="small"
                  sx={{ p: 0.3, ml: 0.5 }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>

          {/* Property rows */}
          {properties.map((prop, pi) => (
            <Box key={prop.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              {/* Property name - fixed left */}
              <Typography
                variant="body2"
                sx={{
                  width: 110,
                  flexShrink: 0,
                  fontWeight: 500,
                  fontSize: 11,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  pr: 0.5,
                  color: '#333',
                }}
              >
                {prop.name}
              </Typography>
              {/* Day cells */}
              <Box sx={{ display: 'flex' }}>
                {propertyDayStates[pi].map((booking, di) => {
                  const bgColor = booking
                    ? (booking.status === 'blocked' ? lightenColor(prop.color, 0.55) : prop.color)
                    : '#F5F5F5';
                  const isBooked = booking && booking.status !== 'blocked';
                  return (
                    <Box
                      key={di}
                      sx={{
                        width: CELL_W,
                        height: 26,
                        flexShrink: 0,
                        bgcolor: bgColor,
                        borderRight: '1px solid #fff',
                        borderRadius: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isBooked ? '#fff' : '#bbb',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {visibleDays[di]?.day}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}

          {/* Day range indicator */}
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: '#999', fontSize: 10 }}>
              Days {startIdx + 1}–{Math.min(startIdx + VISIBLE_DAYS, days.length)} of {days.length}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Occupancies for visible days */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#666' }}>
        Occupancies ({MONTH_NAMES[month]} {visibleDays[0]?.day}–{visibleDays[visibleDays.length - 1]?.day})
      </Typography>

      {visibleOccupancies.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" sx={{ color: '#999' }}>No reservations in this period</Typography>
          </CardContent>
        </Card>
      ) : (
        visibleOccupancies.map(booking => {
          const isBlocked = booking.status === 'blocked';
          const propColor = properties.find(p => p.id === booking.propertyId)?.color || '#999';
          const channelLabel = !isBlocked && booking.channel !== 'manual' ? booking.channel.charAt(0).toUpperCase() + booking.channel.slice(1) : '';
          return (
          <Card key={booking.id} sx={{ mb: 1, borderLeft: `4px solid ${isBlocked ? '#E0E0E0' : propColor}` }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {isBlocked ? (
                    <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>✕</Box>
                  ) : (
                    <ChannelIcon channel={booking.channel} size="small" />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{booking.propertyName}</Typography>
                  {isBlocked && (
                    <Typography variant="caption" sx={{ bgcolor: '#F5F5F5', px: 0.8, py: 0.2, borderRadius: 1, color: '#999', fontSize: 10 }}>Blocked</Typography>
                  )}
                  {channelLabel && (
                    <Typography variant="caption" sx={{ color: '#999', fontSize: 10 }}>via {channelLabel}</Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: '#444' }}>
                  {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    {booking.guestName || (isBlocked ? 'Not available' : 'Guest')}
                  </Typography>
                  {!isBlocked && booking.income > 0 && (
                    <Typography variant="caption" sx={{ color: '#4CAF50', fontWeight: 600, fontSize: 11 }}>
                      {booking.income.toFixed(2)} {booking.currency}
                    </Typography>
                  )}
                </Box>
              </Box>
              <ChevronRightOutlinedIcon sx={{ color: '#ccc' }} />
            </CardContent>
          </Card>
          );
        })
      )}
    </Box>
  );
}
