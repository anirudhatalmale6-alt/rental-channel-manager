'use client';
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Booking } from '@/types';
import { getDaysInMonth, getFirstDayOfWeek, getWeekNumber, toDateString, isDateInRange, getMonthName, lightenColor } from '@/lib/date-utils';

interface Props {
  year: number;
  month: number;
  bookings: Booking[];
  propertyColor?: string;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function MonthCalendar({ year, month, bookings, propertyColor, selectedDate, onSelectDate, onMonthChange }: Props) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const bookingMap = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toDateString(year, month, day);
      const dayBookings = bookings.filter(b =>
        b.status !== 'cancelled' && isDateInRange(dateStr, b.checkIn, b.checkOut)
      );
      // Sort: confirmed bookings first, then blocked — so real bookings take priority
      dayBookings.sort((a, b) => {
        if (a.status === 'blocked' && b.status !== 'blocked') return 1;
        if (a.status !== 'blocked' && b.status === 'blocked') return -1;
        return 0;
      });
      map[dateStr] = dayBookings;
    }
    return map;
  }, [bookings, year, month, daysInMonth]);

  const today = new Date();
  const todayStr = toDateString(today.getFullYear(), today.getMonth(), today.getDate());

  const handlePrev = () => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  };

  const handleNext = () => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  };

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) currentWeek.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // Use property color or fallback to blue
  const activeColor = propertyColor || '#1976D2';

  return (
    <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={handlePrev} size="small"><ChevronLeftIcon /></IconButton>
        <Typography variant="h6">{getMonthName(month)} {year}</Typography>
        <IconButton onClick={handleNext} size="small"><ChevronRightIcon /></IconButton>
      </Box>

      {/* Weekday headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: activeColor, fontWeight: 600, textAlign: 'center' }}>CW</Typography>
        {WEEKDAYS.map(d => (
          <Typography key={d} variant="caption" sx={{ textAlign: 'center', color: '#666', fontWeight: 500 }}>{d}</Typography>
        ))}
      </Box>

      {/* Calendar grid */}
      {weeks.map((week, wi) => {
        const firstDayOfWeek = week.find(d => d !== null);
        const weekDate = firstDayOfWeek ? new Date(year, month, firstDayOfWeek) : null;
        const cw = weekDate ? getWeekNumber(weekDate) : '';

        return (
          <Box key={wi} sx={{ display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: activeColor, textAlign: 'center', lineHeight: '36px', fontSize: 11 }}>
              {cw}
            </Typography>
            {week.map((day, di) => {
              if (day === null) return <Box key={di} />;
              const dateStr = toDateString(year, month, day);
              const dayBookings = bookingMap[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasBooking = dayBookings.length > 0;
              const isBlocked = hasBooking && dayBookings[0].status === 'blocked';
              const cellColor = hasBooking ? (isBlocked ? lightenColor(activeColor, 0.55) : activeColor) : undefined;

              return (
                <Box
                  key={di}
                  onClick={() => onSelectDate?.(dateStr)}
                  sx={{
                    width: '100%',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: isToday ? '50%' : 1,
                    cursor: 'pointer',
                    position: 'relative',
                    bgcolor: hasBooking
                      ? cellColor
                      : (isSelected ? '#E3F2FD' : 'transparent'),
                    color: hasBooking && !isBlocked ? '#fff' : (isToday ? activeColor : 'inherit'),
                    fontWeight: isToday || hasBooking ? 700 : 400,
                    border: isToday ? `2px solid ${activeColor}` : (isSelected ? `2px solid ${activeColor}` : 'none'),
                    '&:hover': { bgcolor: hasBooking ? cellColor : '#F0F0F0' },
                    fontSize: 14,
                    minHeight: 36,
                  }}
                >
                  {day}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}
