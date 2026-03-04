'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useRouter } from 'next/navigation';
import { getProperties, getBookings, getBlockedDates } from '@/lib/store';
import { Property, Booking, BlockedDate } from '@/types';
import { isDateInRange, toDateString, formatDate, deduplicateBookings, lightenColor } from '@/lib/date-utils';
import WeekStrip from '@/components/WeekStrip';
import { syncAllProperties } from '@/lib/sync';
import BookingEditDialog from '@/components/BookingEditDialog';
import BlockDatesDialog from '@/components/BlockDatesDialog';
import AddBookingDialog from '@/components/AddBookingDialog';
import { useCloudSync } from '@/lib/useCloudSync';

export default function HomePage() {
  const router = useRouter();
  const { loaded, cloudStatus } = useCloudSync();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [blockDialog, setBlockDialog] = useState(false);
  const [addBookingDialog, setAddBookingDialog] = useState(false);

  const loadData = useCallback(() => {
    const props = getProperties();
    setProperties(props);
    const allBookings = getBookings();
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
    setBookings(deduplicateBookings([...allBookings, ...blockedAsBookings]));
  }, []);

  useEffect(() => {
    if (loaded) loadData();
  }, [loaded, loadData]);

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

  const weekBookings = useMemo(() => {
    const weekStartStr = weekDates[0];
    const weekEndStr = weekDates[6];
    const filtered = bookings.filter(b => b.status !== 'cancelled' &&
      b.checkIn <= weekEndStr && b.checkOut > weekStartStr);
    return deduplicateBookings(filtered).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }, [bookings, weekDates]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncAllProperties();
      loadData();
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  // Show loading while cloud sync initializes
  if (!loaded) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 8 }}>
        <CircularProgress size={32} sx={{ mb: 2 }} />
        <Typography sx={{ color: '#666' }}>Loading...</Typography>
      </Box>
    );
  }

  if (properties.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Kerlaret Rentals</Typography>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Overview</Typography>
          {cloudStatus === 'synced' && <CloudDoneIcon sx={{ fontSize: 16, color: '#4CAF50' }} />}
          {cloudStatus === 'offline' && <CloudOffIcon sx={{ fontSize: 16, color: '#FF9800' }} />}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton onClick={() => setAddBookingDialog(true)} color="primary" size="small" title="Add booking">
            <AddIcon />
          </IconButton>
          <IconButton onClick={() => setBlockDialog(true)} color="default" size="small" title="Block dates">
            <BlockIcon />
          </IconButton>
          <IconButton onClick={handleSync} disabled={syncing} color="primary">
            <SyncIcon sx={{ animation: syncing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />
          </IconButton>
        </Box>
      </Box>

      {/* Month Quick-Jump */}
      <Box sx={{ mb: 1.5, display: 'flex', overflowX: 'auto', gap: 0.5, pb: 0.5, WebkitOverflowScrolling: 'touch', '&::-webkit-scrollbar': { display: 'none' } }}>
        {Array.from({ length: 12 }, (_, i) => {
          const m = (today.getMonth() + i) % 12;
          const y = today.getFullYear() + Math.floor((today.getMonth() + i) / 12);
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const isCurrentWeekMonth = weekStart.getMonth() === m && weekStart.getFullYear() === y;
          return (
            <Box
              key={`${y}-${m}`}
              onClick={() => {
                // Jump to first Monday of this month
                const firstDay = new Date(y, m, 1);
                const dayOfWeek = firstDay.getDay();
                const diff = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
                const targetMonday = new Date(y, m, 1 + diff);
                // Calculate week offset from current week's Monday
                const currentMonday = new Date(today);
                const cd = currentMonday.getDay();
                currentMonday.setDate(currentMonday.getDate() - cd + (cd === 0 ? -6 : 1));
                currentMonday.setHours(0, 0, 0, 0);
                targetMonday.setHours(0, 0, 0, 0);
                const weekDiff = Math.round((targetMonday.getTime() - currentMonday.getTime()) / (7 * 86400000));
                setWeekOffset(weekDiff);
              }}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                bgcolor: isCurrentWeekMonth ? '#1976D2' : '#F5F5F5',
                color: isCurrentWeekMonth ? '#fff' : '#666',
                cursor: 'pointer',
                flexShrink: 0,
                '&:hover': { bgcolor: isCurrentWeekMonth ? '#1565C0' : '#E0E0E0' },
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {monthNames[m]} {y !== today.getFullYear() ? y : ''}
              </Typography>
            </Box>
          );
        })}
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
          <Card key={booking.id} sx={{ mb: 1, borderLeft: `4px solid ${isBlocked ? '#E0E0E0' : propColor}`, bgcolor: lightenColor(propColor, 0.85), cursor: 'pointer' }} onClick={() => setEditBooking(booking)}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                {isBlocked ? (
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>✕</Box>
                ) : (
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: propColor, flexShrink: 0 }} />
                )}
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{booking.propertyName}</Typography>
                {isBlocked && (
                  <Typography variant="caption" sx={{ bgcolor: lightenColor(propColor, 0.7), px: 0.8, py: 0.2, borderRadius: 1, color: propColor, fontSize: 10, fontWeight: 700 }}>Blocked</Typography>
                )}
                {!isBlocked && booking.channel !== 'manual' && (
                  <Typography variant="caption" sx={{ color: propColor, fontSize: 11, fontWeight: 700 }}>via {booking.channel.charAt(0).toUpperCase() + booking.channel.slice(1)}</Typography>
                )}
              </Box>
              <Typography variant="body2">
                {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  {booking.guestName || (isBlocked ? 'Not available' : 'Guest')}
                </Typography>
                {booking.income > 0 && (
                  <Typography variant="caption" sx={{ color: '#4CAF50', fontWeight: 600, fontSize: 11 }}>
                    {booking.income.toFixed(2)} {booking.currency}
                  </Typography>
                )}
              </Box>
              {booking.checklist && booking.checklist.length > 0 && (
                <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {booking.checklist.map((item, i) => (
                    <Typography key={i} variant="caption" sx={{ fontSize: 10, color: item.checked ? '#4CAF50' : '#999', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      {item.checked ? '✓' : '○'} {item.label}
                    </Typography>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
          );
        })
      )}

      <BookingEditDialog
        booking={editBooking}
        onClose={() => setEditBooking(null)}
        onSaved={(updated) => {
          setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
        }}
      />

      <BlockDatesDialog
        open={blockDialog}
        properties={properties}
        onClose={() => setBlockDialog(false)}
        onSaved={() => {
          setBlockDialog(false);
          loadData();
        }}
      />

      <AddBookingDialog
        open={addBookingDialog}
        properties={properties}
        onClose={() => setAddBookingDialog(false)}
        onSaved={() => {
          setAddBookingDialog(false);
          loadData();
        }}
      />
    </Box>
  );
}
