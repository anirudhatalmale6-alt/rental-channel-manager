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
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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
  const [checklist, setChecklist] = useState<{ label: string; checked: boolean }[]>([]);

  useEffect(() => {
    if (booking) {
      setGuestName(booking.guestName || '');
      setIncome(booking.income > 0 ? String(booking.income) : '');
      setAdults(booking.adults > 0 ? String(booking.adults) : '');
      setChildren(booking.children > 0 ? String(booking.children) : '');
      setChecklist(booking.checklist ? [...booking.checklist] : []);
    }
  }, [booking]);

  if (!booking) return null;

  const isBlocked = booking.status === 'blocked';

  const handleSave = () => {
    const cleanChecklist = checklist.filter(item => item.label.trim() !== '');
    const updates: Partial<Booking> = {
      guestName: guestName.trim() || 'Guest',
      income: parseFloat(income) || 0,
      adults: parseInt(adults) || 0,
      children: parseInt(children) || 0,
      checklist: cleanChecklist,
    };
    updateBookingField(booking.id, updates);
    onSaved({ ...booking, ...updates });
    onClose();
  };

  const addChecklistItem = () => {
    setChecklist([...checklist, { label: '', checked: false }]);
  };

  const updateChecklistLabel = (index: number, label: string) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], label };
    setChecklist(updated);
  };

  const toggleChecklistItem = (index: number) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], checked: !updated[index].checked };
    setChecklist(updated);
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
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

        {/* Checklist */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>Notes / Checklist</Typography>
            <IconButton size="small" onClick={addChecklistItem} sx={{ p: 0.3 }}>
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          {checklist.map((item, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Checkbox
                checked={item.checked}
                onChange={() => toggleChecklistItem(i)}
                size="small"
                sx={{ p: 0.3 }}
              />
              <TextField
                value={item.label}
                onChange={e => updateChecklistLabel(i, e.target.value)}
                size="small"
                placeholder="e.g., Info sent, Key handed over..."
                variant="standard"
                sx={{ flex: 1 }}
                InputProps={{ sx: { fontSize: 13, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? '#999' : 'inherit' } }}
              />
              <IconButton size="small" onClick={() => removeChecklistItem(i)} sx={{ p: 0.3 }}>
                <DeleteOutlineIcon sx={{ fontSize: 16, color: '#ccc' }} />
              </IconButton>
            </Box>
          ))}
          {checklist.length === 0 && (
            <Typography variant="caption" sx={{ color: '#bbb', fontSize: 11 }}>
              Tap + to add notes like &quot;Info sent&quot;, &quot;Key handed over&quot;...
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
