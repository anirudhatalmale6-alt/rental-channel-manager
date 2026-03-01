'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { getProperties, getBookings, getBlockedDates } from '@/lib/store';
import { Property, Booking, BlockedDate } from '@/types';
import { isDateInRange, toDateString, formatDate } from '@/lib/date-utils';
import WeekStrip from '@/components/WeekStrip';
import ChannelIcon from '@/components/ChannelIcon';
import { syncAllProperties } from '@/lib/sync';

export default function HomePage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const props = getProperties();
    setProperties(props);
    const allBookings = getBookings();
    // Merge app-created blocked dates into bookings for display
    const blocked = getBlockedDates();
    const blockedAsBookings: Booking[] = blocked.map(b => ({
      id: b.id,
      propertyId: b.propertyId,
      propertyName: props.find(p => p.id === b.propertyId)?.name || '',
      guestName: b.reason || 'Blocked',
      checkIn: b.startDate,
      checkOut: b.endDate,
      adults: 0,
      children: 0,
      income: 0,
      currency: 'EUR',
      channel: 'blocked' as const,
      status: 'blocked' as const,
      uid: `block-${b.id}`,
    }));
    setBookings([...allBookings, ...blockedAsBookings]);
  }, []);

  const today = new Date();
  const weekStart = useMemo(() => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7;
    d.setDate(diff);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return toDateString(d.getFullYear(), d.getMonth(), d.getDate());
    });
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return `${weekStart.toLocaleDateString('en-GB', opts)} - ${end.toLocaleDateString('en-GB', opts)} ${end.getFullYear()}`;
  }, [weekStart]);

  const dayHeaders = useMemo(() => {
    return weekDates.map(d => {
      const date = new Date(d + 'T00:00:00');
      return { day: date.getDate(), weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2) };
    });
  }, [weekDates]);

  // Occupancies for the displayed week — only bookings that overlap with the week shown
  const weekEndDate = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + 6);
    return toDateString(d.getFullYear(), d.getMonth(), d.getDate());
  }, [weekStart]);

  const weekBookings = useMemo(() => {
    const weekStartStr = weekDates[0];
    const weekEndStr = weekDates[6];
    // A booking overlaps if checkIn <= weekEnd AND checkOut > weekStart
    return bookings
      .filter(b => b.status !== 'cancelled' &&
        b.checkIn <= weekEndStr && b.checkOut > weekStartStr)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }, [bookings, weekDates]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncAllProperties();
      setBookings(getBookings());
    } finally {
      setSyncing(false);
    }
  }, []);

  if (properties.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Rental Channel Manager</Typography>
        <Typography sx={{ mb: 3, color: '#666' }}>
          Get started by adding your properties and connecting your iCal feeds.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/settings')}
          size="large"
        >
          Add Your First Property
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Overview</Typography>
        <IconButton onClick={handleSync} disabled={syncing} color="primary">
          <SyncIcon sx={{ animation: syncing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
        </IconButton>
      </Box>

      {/* Week Navigator */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <IconButton size="small" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeftIcon /></IconButton>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{weekLabel}</Typography>
            <IconButton size="small" onClick={() => setWeekOffset(w => w + 1)}><ChevronRightIcon /></IconButton>
          </Box>

          {/* Day headers */}
          <Box sx={{ display: 'flex', mb: 1 }}>
            <Box sx={{ width: 140 }} />
            <Box sx={{ display: 'flex', flex: 1, gap: 0.25 }}>
              {dayHeaders.map((h, i) => (
                <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#999', fontSize: 10 }}>{h.weekday}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, fontSize: 11 }}>{h.day}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Property strips */}
          {properties.map(p => (
            <WeekStrip key={p.id} property={p} bookings={bookings} weekDates={weekDates} />
          ))}
        </CardContent>
      </Card>

      {/* Occupancies for displayed week */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#666' }}>
        Occupancies ({weekLabel})
      </Typography>

      {weekBookings.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" sx={{ color: '#999' }}>No reservations this week</Typography>
          </CardContent>
        </Card>
      ) : (
        weekBookings.map(booking => {
          const isBlocked = booking.status === 'blocked';
          const propColor = properties.find(p => p.id === booking.propertyId)?.color || '#999';
          return (
          <Card key={booking.id} sx={{ mb: 1, borderLeft: `4px solid ${isBlocked ? '#E0E0E0' : propColor}` }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
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
              </Box>
              <Typography variant="body2">
                {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                {booking.guestName || (isBlocked ? 'Not available' : 'Guest')}
              </Typography>
            </CardContent>
          </Card>
          );
        })
      )}
    </Box>
  );
}
