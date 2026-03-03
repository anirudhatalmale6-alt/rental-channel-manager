'use client';
import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import BlockIcon from '@mui/icons-material/Block';
import ViewListIcon from '@mui/icons-material/ViewList';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import { getProperties, getBookings, addBlockedDate, getBlockedDates, removeBlockedDate } from '@/lib/store';
import { Property, Booking, BlockedDate } from '@/types';
import { isDateInRange, deduplicateBookings } from '@/lib/date-utils';
import { useCloudSync } from '@/lib/useCloudSync';
import PropertySelector from '@/components/PropertySelector';
import MonthCalendar from '@/components/MonthCalendar';
import BookingCard from '@/components/BookingCard';
import BookingEditDialog from '@/components/BookingEditDialog';
import MultiPropertyMonth from '@/components/MultiPropertyMonth';

export default function CalendarPage() {
  const { loaded } = useCloudSync();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');
  const [editBooking, setEditBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!loaded) return;
    const props = getProperties();
    setProperties(props);
    setBookings(getBookings());
    setBlockedDates(getBlockedDates());
    if (props.length > 0) setSelectedProperty(props[0].id);
  }, [loaded]);

  const filteredBookings = useMemo(() => {
    if (!selectedProperty) return [];
    return bookings.filter(b => b.propertyId === selectedProperty && b.status !== 'cancelled');
  }, [bookings, selectedProperty]);

  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    return filteredBookings.filter(b => isDateInRange(selectedDate, b.checkIn, b.checkOut));
  }, [filteredBookings, selectedDate]);

  const selectedPropertyBlocks = useMemo(() => {
    // Only show blocks that overlap with the currently displayed month
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const monthEnd = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`;
    return blockedDates.filter(b =>
      b.propertyId === selectedProperty &&
      b.startDate < monthEnd && b.endDate > monthStart
    );
  }, [blockedDates, selectedProperty, year, month]);

  // Convert ALL blocked dates to booking objects for display
  const allBlockedAsBookings = useMemo((): Booking[] => {
    return blockedDates.map(b => ({
      id: b.id,
      propertyId: b.propertyId,
      propertyName: properties.find(p => p.id === b.propertyId)?.name || '',
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
  }, [blockedDates, properties]);

  // All bookings + blocked dates merged and deduplicated (for multi-property view)
  const allBookingsWithBlocks = useMemo(() => {
    return deduplicateBookings([...bookings, ...allBlockedAsBookings]);
  }, [bookings, allBlockedAsBookings]);

  const allDisplayBookings = useMemo(() => {
    const selectedBlocks = allBlockedAsBookings.filter(b => b.propertyId === selectedProperty);
    return deduplicateBookings([...filteredBookings, ...selectedBlocks]);
  }, [filteredBookings, allBlockedAsBookings, selectedProperty]);

  const handleBlockDates = () => {
    if (!selectedDate || !blockEndDate || !selectedProperty) return;
    addBlockedDate({
      propertyId: selectedProperty,
      startDate: selectedDate,
      endDate: blockEndDate,
      reason: blockReason || 'Not available',
    });
    setBlockedDates(getBlockedDates());
    setBlockDialog(false);
    setBlockEndDate('');
    setBlockReason('');
  };

  const handleUnblock = (blockId: string) => {
    removeBlockedDate(blockId);
    setBlockedDates(getBlockedDates());
  };

  if (properties.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 8 }}>
        <Typography sx={{ color: '#666' }}>Add properties in Settings first</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* View toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 1 }}>
        {viewMode === 'single' ? (
          <PropertySelector
            properties={properties}
            selectedId={selectedProperty}
            onChange={setSelectedProperty}
          />
        ) : (
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>All Properties</Typography>
        )}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => { if (v) setViewMode(v); }}
          size="small"
        >
          <ToggleButton value="all" sx={{ px: 1.5, py: 0.5 }}>
            <ViewListIcon sx={{ fontSize: 18, mr: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: 11 }}>All</Typography>
          </ToggleButton>
          <ToggleButton value="single" sx={{ px: 1.5, py: 0.5 }}>
            <CalendarViewMonthIcon sx={{ fontSize: 18, mr: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: 11 }}>Single</Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Multi-property view */}
      {viewMode === 'all' && (
        <MultiPropertyMonth
          year={year}
          month={month}
          properties={properties}
          bookings={allBookingsWithBlocks}
          onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
          onBookingUpdated={(updated) => {
            setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
          }}
        />
      )}

      {/* Single property view */}
      {viewMode === 'single' && (
        <>
          <MonthCalendar
            year={year}
            month={month}
            bookings={allDisplayBookings}
            propertyColor={properties.find(p => p.id === selectedProperty)?.color}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onMonthChange={(y, m) => { setYear(y); setMonth(m); setSelectedDate(''); }}
          />

          {selectedDate && (
            <Box sx={{ mt: 1, mb: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<BlockIcon />}
                onClick={() => {
                  setBlockEndDate(selectedDate);
                  setBlockDialog(true);
                }}
              >
                Block Dates
              </Button>
            </Box>
          )}

          {selectedDate && selectedDayBookings.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#666', fontWeight: 600 }}>
                Reservations on {selectedDate}
              </Typography>
              {selectedDayBookings.map(b => (
                <Box key={b.id} onClick={() => setEditBooking(b)} sx={{ cursor: 'pointer' }}>
                  <BookingCard booking={b} />
                </Box>
              ))}
            </Box>
          )}

          {selectedPropertyBlocks.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#666', fontWeight: 600 }}>
                Blocked Dates
              </Typography>
              {selectedPropertyBlocks.map(block => (
                <Box key={block.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fff', p: 1.5, borderRadius: 1, mb: 0.5, border: '1px solid #eee' }}>
                  <Typography variant="body2">
                    {block.startDate} → {block.endDate} ({block.reason || 'Blocked'})
                  </Typography>
                  <Button size="small" color="error" onClick={() => handleUnblock(block.id)}>
                    Unblock
                  </Button>
                </Box>
              ))}
            </Box>
          )}

          <Dialog open={blockDialog} onClose={() => setBlockDialog(false)} fullWidth maxWidth="xs">
            <DialogTitle>Block Dates</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                Block dates starting from {selectedDate}
              </Typography>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={blockEndDate}
                onChange={e => setBlockEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: selectedDate }}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Reason (optional)"
                fullWidth
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="e.g., Maintenance, Personal use"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBlockDialog(false)}>Cancel</Button>
              <Button onClick={handleBlockDates} variant="contained">Block</Button>
            </DialogActions>
          </Dialog>

          <BookingEditDialog
            booking={editBooking}
            onClose={() => setEditBooking(null)}
            onSaved={(updated) => {
              setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
              setEditBooking(null);
            }}
          />
        </>
      )}
    </Box>
  );
}
