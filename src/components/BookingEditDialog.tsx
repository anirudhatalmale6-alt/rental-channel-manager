'use client';
import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Booking } from '@/types';
import { formatDate } from '@/lib/date-utils';
import { updateBookingField } from '@/lib/store';

interface Props {
  booking: Booking | null;
  onClose: () => void;
  onSaved: (updated: Booking) => void;
}

export default function BookingEditDialog({ booking, onClose, onSaved }: Props) {
  const [guestName, setGuestName] = useState('');
  const [income, setIncome] = useState('');
  const [adults, setAdults] = useState('');
  const [children, setChildren] = useState('');

  useEffect(() => {
    if (booking) {
      setGuestName(booking.guestName || '');
      setIncome(booking.income > 0 ? String(booking.income) : '');
      setAdults(booking.adults > 0 ? String(booking.adults) : '');
      setChildren(booking.children > 0 ? String(booking.children) : '');
    }
  }, [booking]);

  if (!booking) return null;

  const isBlocked = booking.status === 'blocked';

  const handleSave = () => {
    const updates: Partial<Booking> = {
      guestName: guestName.trim() || 'Guest',
      income: parseFloat(income) || 0,
      adults: parseInt(adults) || 0,
      children: parseInt(children) || 0,
    };
    updateBookingField(booking.id, updates);
    onSaved({ ...booking, ...updates });
    onClose();
  };

  return (
    <Dialog open={!!booking} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1 }}>Edit Booking</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            {booking.propertyName} &middot; {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)}
          </Typography>
          {!isBlocked && booking.channel !== 'manual' && (
            <Typography variant="caption" sx={{ color: '#999' }}>
              via {booking.channel.charAt(0).toUpperCase() + booking.channel.slice(1)}
            </Typography>
          )}
        </Box>
        <TextField
          label="Guest Name"
          fullWidth
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
          size="small"
          autoFocus
          placeholder="Enter guest name"
          sx={{ mb: 1.5 }}
        />
        <TextField
          label="Income (€)"
          fullWidth
          value={income}
          onChange={e => setIncome(e.target.value)}
          size="small"
          type="number"
          placeholder="e.g., 450"
          sx={{ mb: 1.5 }}
        />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            label="Adults"
            value={adults}
            onChange={e => setAdults(e.target.value)}
            size="small"
            type="number"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Children"
            value={children}
            onChange={e => setChildren(e.target.value)}
            size="small"
            type="number"
            sx={{ flex: 1 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
