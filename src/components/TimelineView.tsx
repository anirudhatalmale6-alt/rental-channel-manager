'use client';
import { useMemo, useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Property, Booking } from '@/types';
import { isDateInRange, lightenColor } from '@/lib/date-utils';
import BookingEditDialog from './BookingEditDialog';

interface Props {
  year: number;
  month: number;
  properties: Property[];
  bookings: Booking[];
  onMonthChange: (year: number, month: number) => void;
  onBookingUpdated?: (updated: Booking) => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const CELL_W = 36;
const ROW_H = 48;
const LABEL_W = 90;

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + 'T00:00:00');
  const d2 = new Date(b + 'T00:00:00');
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export default function TimelineView({ year, month, properties, bookings, onMonthChange, onBookingUpdated }: Props) {
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const monthStartStr = days[0].dateStr;
  const monthEndDate = new Date(year, month + 1, 1);
  const monthEndStr = toDateStr(monthEndDate);

  // For each property, get bookings that overlap this month
  const propertyBookings = useMemo(() => {
    return properties.map(prop => {
      return bookings.filter(b =>
        b.propertyId === prop.id &&
        b.status !== 'cancelled' &&
        b.checkIn < monthEndStr &&
        b.checkOut > monthStartStr
      );
    });
  }, [properties, bookings, monthStartStr, monthEndStr]);

  const handlePrevMonth = () => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  };

  const totalWidth = days.length * CELL_W;

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

      {/* Timeline card */}
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ display: 'flex' }}>
            {/* Fixed left column: property labels */}
            <Box sx={{ width: LABEL_W, flexShrink: 0, zIndex: 2, bgcolor: '#fff', borderRight: '1px solid #eee' }}>
              {/* Empty header aligned with day headers */}
              <Box sx={{ height: 44, borderBottom: '1px solid #eee' }} />
              {/* Property labels */}
              {properties.map(prop => (
                <Box
                  key={prop.id}
                  sx={{
                    height: ROW_H,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    borderBottom: '1px solid #f5f5f5',
                  }}
                >
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: prop.color, flexShrink: 0 }} />
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: '#333',
                    }}
                  >
                    {prop.name}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Scrollable right area: days + bars */}
            <Box
              ref={scrollRef}
              sx={{
                flex: 1,
                overflowX: 'auto',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {/* Day headers */}
              <Box sx={{ display: 'flex', height: 44, borderBottom: '1px solid #eee', minWidth: totalWidth }}>
                {days.map(d => (
                  <Box
                    key={d.day}
                    sx={{
                      width: CELL_W,
                      flexShrink: 0,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      bgcolor: d.isToday ? '#E3F2FD' : 'transparent',
                    }}
                  >
                    <Typography sx={{ fontSize: 10, color: d.isWeekend ? '#E91E63' : '#aaa', lineHeight: 1.3 }}>
                      {d.weekday}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: d.isToday ? 700 : 500, lineHeight: 1.3, color: d.isToday ? '#1976D2' : '#333' }}>
                      {d.day}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Property rows with booking bars */}
              {properties.map((prop, pi) => (
                <Box
                  key={prop.id}
                  sx={{
                    position: 'relative',
                    height: ROW_H,
                    minWidth: totalWidth,
                    borderBottom: '1px solid #f5f5f5',
                  }}
                >
                  {/* Day cell backgrounds */}
                  <Box sx={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    {days.map(d => (
                      <Box
                        key={d.day}
                        sx={{
                          width: CELL_W,
                          flexShrink: 0,
                          borderRight: '1px solid #f5f5f5',
                          bgcolor: d.isWeekend ? '#FAFAFA' : 'transparent',
                        }}
                      />
                    ))}
                  </Box>

                  {/* Booking bars overlay */}
                  {propertyBookings[pi].map(booking => {
                    const isBlocked = booking.status === 'blocked';
                    // Calculate bar position relative to month start
                    const barStartDate = booking.checkIn < monthStartStr ? monthStartStr : booking.checkIn;
                    const barEndDate = booking.checkOut > monthEndStr ? monthEndStr : booking.checkOut;
                    const startDay = daysBetween(monthStartStr, barStartDate);
                    const endDay = daysBetween(monthStartStr, barEndDate);
                    const barWidth = (endDay - startDay) * CELL_W;

                    if (barWidth <= 0) return null;

                    const barColor = isBlocked ? lightenColor(prop.color, 0.4) : prop.color;
                    const textColor = isBlocked ? '#666' : '#fff';
                    const channelTag = !isBlocked && booking.channel !== 'manual' && booking.channel !== 'blocked'
                      ? booking.channel.charAt(0).toUpperCase() + booking.channel.slice(1)
                      : '';
                    const name = isBlocked
                      ? (booking.guestName === 'Blocked' ? 'Blocked' : booking.guestName)
                      : (booking.guestName || 'Reserved');
                    const label = channelTag ? `${name} · ${channelTag}` : name;

                    return (
                      <Box
                        key={booking.id}
                        onClick={() => setEditBooking(booking)}
                        sx={{
                          position: 'absolute',
                          left: startDay * CELL_W + 1,
                          top: 4,
                          width: barWidth - 2,
                          height: ROW_H - 8,
                          bgcolor: barColor,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          px: 0.5,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          zIndex: 1,
                          opacity: isBlocked ? 0.7 : 1,
                          '&:hover': { opacity: 0.85 },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: textColor,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.2,
                          }}
                        >
                          {label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Legend */}
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
        {properties.map(p => (
          <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 6, borderRadius: 0.5, bgcolor: p.color }} />
            <Typography variant="caption" sx={{ fontSize: 10, color: '#666' }}>{p.name}</Typography>
          </Box>
        ))}
      </Box>

      <BookingEditDialog
        booking={editBooking}
        onClose={() => setEditBooking(null)}
        onSaved={(updated) => {
          setEditBooking(null);
          onBookingUpdated?.(updated);
        }}
      />
    </Box>
  );
}
