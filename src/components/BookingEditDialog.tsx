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

  useEffect(() => {
    if (booking) {
      setGuestName(booking.guestName || '');
    }
  }, [booking]);

  if (!booking) return null;

  const isBlocked = booking.status === 'blocked';

  const handleSave = () => {
    updateBookingField(booking.id, { guestName: guestName.trim() || 'Guest' });
    onSaved({ ...booking, guestName: guestName.trim() || 'Guest' });
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
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
