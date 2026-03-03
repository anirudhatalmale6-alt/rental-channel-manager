'use client';
import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { getProperties, getBookings } from '@/lib/store';
import { Property, Booking, CHANNEL_COLORS, CHANNEL_LABELS } from '@/types';
import { getNights } from '@/lib/date-utils';
import PropertySelector from '@/components/PropertySelector';
import { useCloudSync } from '@/lib/useCloudSync';

function isRealBooking(b: Booking): boolean {
  if (b.status === 'cancelled' || b.status === 'blocked') return false;
  if (b.channel === 'blocked') return false;
  const name = (b.guestName || '').toLowerCase().trim();
  const isPlaceholder = (name === 'reserved' || name === 'not available' || name === 'blocked' || name === '')
    && b.income === 0 && b.adults === 0;
  if (isPlaceholder) return false;
  return true;
}

export default function StatsPage() {
  const { loaded } = useCloudSync();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!loaded) return;
    setProperties(getProperties());
    setBookings(getBookings());
  }, [loaded]);

  const filteredBookings = useMemo(() => {
    let active = bookings.filter(isRealBooking);
    if (selectedProperty !== 'all') {
      active = active.filter(b => b.propertyId === selectedProperty);
    }
    // Filter by selected year (check-in year)
    active = active.filter(b => {
      const y = parseInt(b.checkIn.substring(0, 4));
      return y === selectedYear;
    });
    return active;
  }, [bookings, selectedProperty, selectedYear]);

  const stats = useMemo(() => {
    const totalBookings = filteredBookings.length;
    const totalIncome = filteredBookings.reduce((sum, b) => sum + b.income, 0);
    const totalNights = filteredBookings.reduce((sum, b) => sum + getNights(b.checkIn, b.checkOut), 0);

    // Channel breakdown
    const byChannel: Record<string, number> = {};
    filteredBookings.forEach(b => {
      byChannel[b.channel] = (byChannel[b.channel] || 0) + 1;
    });

    // Monthly breakdown
    const monthlyIncome: { month: string; income: number; bookings: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const monthBookings = filteredBookings.filter(b => {
        const bm = parseInt(b.checkIn.substring(5, 7));
        return bm === m + 1;
      });
      monthlyIncome.push({
        month: new Date(selectedYear, m).toLocaleDateString('en-US', { month: 'short' }),
        income: monthBookings.reduce((s, b) => s + b.income, 0),
        bookings: monthBookings.length,
      });
    }

    return { totalBookings, totalIncome, totalNights, byChannel, monthlyIncome };
  }, [filteredBookings, selectedYear]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Statistics</Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <PropertySelector
          properties={properties}
          selectedId={selectedProperty}
          onChange={setSelectedProperty}
          showAll
        />
      </Box>

      {/* Year selector */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2, gap: 1 }}>
        <IconButton size="small" onClick={() => setSelectedYear(y => y - 1)}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 60, textAlign: 'center' }}>
          {selectedYear}
        </Typography>
        <IconButton size="small" onClick={() => setSelectedYear(y => y + 1)}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Summary cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976D2' }}>
              {stats.totalBookings}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666' }}>Bookings</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
              {stats.totalNights}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666' }}>Nights</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>
              {stats.totalIncome > 0 ? `€${stats.totalIncome.toFixed(0)}` : '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666' }}>Income</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#9C27B0' }}>
              {stats.totalNights > 0 && stats.totalIncome > 0
                ? `€${(stats.totalIncome / stats.totalNights).toFixed(0)}`
                : '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666' }}>Avg/Night</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Channel breakdown */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Bookings by Channel</Typography>
          {Object.entries(stats.byChannel).length === 0 ? (
            <Typography variant="body2" sx={{ color: '#999' }}>No booking data yet</Typography>
          ) : (
            Object.entries(stats.byChannel).map(([channel, count]) => {
              const total = stats.totalBookings || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <Box key={channel} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS] || channel}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>{count} ({pct}%)</Typography>
                  </Box>
                  <Box sx={{ height: 6, bgcolor: '#f0f0f0', borderRadius: 3 }}>
                    <Box
                      sx={{
                        height: '100%',
                        width: `${pct}%`,
                        bgcolor: CHANNEL_COLORS[channel as keyof typeof CHANNEL_COLORS] || '#999',
                        borderRadius: 3,
                      }}
                    />
                  </Box>
                </Box>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Monthly overview */}
      <Card>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Monthly Overview
          </Typography>
          {stats.monthlyIncome.map(m => (
            <Box key={m.month} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px solid #f5f5f5' }}>
              <Typography variant="body2" sx={{ width: 40 }}>{m.month}</Typography>
              <Box sx={{ flex: 1, mx: 1.5, height: 4, bgcolor: '#f0f0f0', borderRadius: 2 }}>
                <Box sx={{ height: '100%', bgcolor: '#1976D2', borderRadius: 2, width: `${Math.min((m.bookings / Math.max(...stats.monthlyIncome.map(x => x.bookings), 1)) * 100, 100)}%` }} />
              </Box>
              <Typography variant="caption" sx={{ color: '#666', width: 80, textAlign: 'right' }}>
                {m.bookings} booking{m.bookings !== 1 ? 's' : ''}
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
