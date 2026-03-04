'use client';
import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import { Property, Booking } from '@/types';
import { upsertBooking } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  open: boolean;
  properties: Property[];
  onClose: () => void;
  onSaved: () => void;
}

export default function AddBookingDialog({ open, properties, onClose, onSaved }: Props) {
  const [propertyId, setPropertyId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [income, setIncome] = useState('');
  const [adults, setAdults] = useState('');
  const [children, setChildren] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const resetForm = () => {
    setPropertyId('');
    setGuestName('');
    setCheckIn('');
    setCheckOut('');
    setIncome('');
    setAdults('');
    setChildren('');
    setEmail('');
    setPhone('');
  };

  const handleSave = () => {
    if (!propertyId || !checkIn || !checkOut) return;
    const prop = properties.find(p => p.id === propertyId);
    const id = uuidv4();
    const booking: Booking = {
      id,
      propertyId,
      propertyName: prop?.name || '',
      guestName: guestName.trim() || 'Guest',
      checkIn,
      checkOut,
      adults: parseInt(adults) || 0,
      children: parseInt(children) || 0,
      income: parseFloat(income) || 0,
      currency: 'EUR',
      channel: 'manual',
      status: 'confirmed',
      uid: `manual-${id}`,
      email: email.trim(),
      phone: phone.trim(),
    };
    upsertBooking(booking);
    resetForm();
    onSaved();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1 }}>Add Booking</DialogTitle>
      <DialogContent>
        <TextField
          select
          label="Property"
          fullWidth
          value={propertyId}
          onChange={e => setPropertyId(e.target.value)}
          size="small"
          sx={{ mt: 1, mb: 1.5 }}
        >
          {properties.map(p => (
            <MenuItem key={p.id} value={p.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
                {p.name}
              </Box>
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Guest Name"
          fullWidth
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
          size="small"
          placeholder="Enter guest name"
          sx={{ mb: 1.5 }}
        />
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <TextField
            label="Check-in"
            type="date"
            value={checkIn}
            onChange={e => setCheckIn(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Check-out"
            type="date"
            value={checkOut}
            onChange={e => setCheckOut(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
        </Box>
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
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
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
        <TextField
          label="Email"
          fullWidth
          value={email}
          onChange={e => setEmail(e.target.value)}
          size="small"
          type="email"
          placeholder="guest@example.com"
          sx={{ mb: 1.5 }}
        />
        <TextField
          label="Phone"
          fullWidth
          value={phone}
          onChange={e => setPhone(e.target.value)}
          size="small"
          type="tel"
          placeholder="+33 6 12 34 56 78"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!propertyId || !checkIn || !checkOut}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
