'use client';
import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getProperties, getBookings, getBlockedDates } from '@/lib/store';
import { Property, Booking, BlockedDate, CHANNEL_LABELS } from '@/types';
import { formatDate, getNights, lightenColor } from '@/lib/date-utils';
import { useCloudSync } from '@/lib/useCloudSync';
import BookingEditDialog from '@/components/BookingEditDialog';

export default function SummaryPage() {
  const { loaded } = useCloudSync();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editBooking, setEditBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!loaded) return;
    const props = getProperties();
    setProperties(props);
    const allBookings = getBookings();
    const blocked = getBlockedDates();
    const blockedAsBookings: Booking[] = blocked.map((b: BlockedDate) => ({
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
  }, [loaded]);

  const sortedBookings = useMemo(() => {
    let filtered = bookings.filter(b => b.status !== 'cancelled');
    // Filter by year
    const yearStr = String(selectedYear);
    filtered = filtered.filter(b => b.checkIn.startsWith(yearStr));
    return filtered.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }, [bookings, selectedYear]);

  // Real bookings only (exclude blocked) for summary totals
  const realBookings = useMemo(() => {
    return sortedBookings.filter(b => b.status !== 'blocked' && b.channel !== 'blocked');
  }, [sortedBookings]);

  // Year summary stats
  const yearSummary = useMemo(() => {
    const totalBookings = realBookings.length;
    const totalNights = realBookings.reduce((sum, b) => sum + getNights(b.checkIn, b.checkOut), 0);
    const totalIncome = realBookings.reduce((sum, b) => sum + (b.income || 0), 0);
    return { totalBookings, totalNights, totalIncome };
  }, [realBookings]);

  // Group bookings by month
  const groupedByMonth = useMemo(() => {
    const groups: { label: string; bookings: Booking[] }[] = [];
    let currentLabel = '';
    let currentGroup: Booking[] = [];

    for (const booking of sortedBookings) {
      const d = new Date(booking.checkIn + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (label !== currentLabel) {
        if (currentGroup.length > 0) {
          groups.push({ label: currentLabel, bookings: currentGroup });
        }
        currentLabel = label;
        currentGroup = [booking];
      } else {
        currentGroup.push(booking);
      }
    }
    if (currentGroup.length > 0) {
      groups.push({ label: currentLabel, bookings: currentGroup });
    }

    return groups;
  }, [sortedBookings]);

  const getStatusLabel = (booking: Booking) => {
    if (booking.status === 'blocked') return 'Blocked';
    if (booking.status === 'cancelled') return 'Cancelled';
    return 'Confirmed';
  };

  const getStatusColor = (booking: Booking) => {
    if (booking.status === 'blocked') return '#9E9E9E';
    if (booking.status === 'cancelled') return '#f44336';
    return '#4CAF50';
  };

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Summary</Typography>
      </Box>

      {/* Year selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <IconButton size="small" onClick={() => setSelectedYear(y => y - 1)}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mx: 2, minWidth: 50, textAlign: 'center' }}>
          {selectedYear}
        </Typography>
        <IconButton size="small" onClick={() => setSelectedYear(y => y + 1)}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Year summary totals */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Card sx={{ flex: 1, bgcolor: '#E3F2FD' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1565C0' }}>
              {yearSummary.totalBookings}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontSize: 10 }}>Bookings</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, bgcolor: '#E8F5E9' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2E7D32' }}>
              {yearSummary.totalNights}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontSize: 10 }}>Nights</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, bgcolor: '#FFF3E0' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#E65100' }}>
              {yearSummary.totalIncome > 0 ? `${yearSummary.totalIncome.toLocaleString()}` : '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontSize: 10 }}>Income (EUR)</Typography>
          </CardContent>
        </Card>
      </Box>

      {sortedBookings.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ color: '#999' }}>No bookings for {selectedYear}</Typography>
          </CardContent>
        </Card>
      ) : (
        groupedByMonth.map(group => (
          <Box key={group.label} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#666', mb: 1, ml: 0.5 }}>
              {group.label}
            </Typography>
            {group.bookings.map(booking => {
              const isBlocked = booking.status === 'blocked';
              const isCancelled = booking.status === 'cancelled';
              const propColor = properties.find(p => p.id === booking.propertyId)?.color || '#999';
              const nights = getNights(booking.checkIn, booking.checkOut);
              const channelLabel = booking.channel !== 'blocked'
                ? CHANNEL_LABELS[booking.channel] || booking.channel
                : '';

              return (
                <Card
                  key={booking.id}
                  sx={{
                    mb: 1,
                    borderLeft: `4px solid ${isBlocked ? '#9E9E9E' : isCancelled ? '#f44336' : propColor}`,
                    bgcolor: lightenColor(propColor, 0.9),
                    cursor: 'pointer',
                    opacity: isCancelled ? 0.6 : 1,
                  }}
                  onClick={() => setEditBooking(booking)}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Status + Channel */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: getStatusColor(booking) }}>
                        {getStatusLabel(booking)}
                      </Typography>
                      {channelLabel && (
                        <Chip label={channelLabel} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                      )}
                    </Box>

                    {/* Details grid */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {/* Dates */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: propColor, fontWeight: 600, fontSize: 10 }}>Arr./dep.</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>
                          {formatDate(booking.checkIn)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>
                          {formatDate(booking.checkOut)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#999', fontSize: 10 }}>
                          {nights} night{nights !== 1 ? 's' : ''}
                        </Typography>
                      </Box>

                      {/* Property */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: propColor, fontWeight: 600, fontSize: 10 }}>Property</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: propColor, flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>
                            {booking.propertyName}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Income */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: propColor, fontWeight: 600, fontSize: 10 }}>Income</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                          {booking.income > 0 ? `${booking.income.toFixed(2)} EUR` : '—'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Guest name */}
                    {!isBlocked && (
                      <Typography variant="caption" sx={{ color: '#666', mt: 0.5, display: 'block' }}>
                        {booking.guestName || 'Guest'}
                      </Typography>
                    )}

                    {/* Checklist preview */}
                    {booking.checklist && booking.checklist.length > 0 && (
                      <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {booking.checklist.map((item, i) => (
                          <Typography key={i} variant="caption" sx={{ fontSize: 10, color: item.checked ? '#4CAF50' : '#999' }}>
                            {item.checked ? '✓' : '○'} {item.label}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        ))
      )}

      <BookingEditDialog
        booking={editBooking}
        onClose={() => setEditBooking(null)}
        onSaved={(updated) => {
          setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
          setEditBooking(null);
        }}
      />
    </Box>
  );
}
