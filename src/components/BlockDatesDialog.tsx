'use client';
import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { Property } from '@/types';
import { addBlockedDate, getBlockedDates, removeBlockedDate } from '@/lib/store';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

interface Props {
  open: boolean;
  properties: Property[];
  onClose: () => void;
  onSaved: () => void;
}

export default function BlockDatesDialog({ open, properties, onClose, onSaved }: Props) {
  const [propertyId, setPropertyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const blocked = getBlockedDates();

  const handleAdd = () => {
    setError('');
    if (!propertyId) { setError('Select a property'); return; }
    if (!startDate) { setError('Select start date'); return; }
    if (!endDate) { setError('Select end date'); return; }
    if (endDate <= startDate) { setError('End date must be after start date'); return; }

    addBlockedDate({
      propertyId,
      startDate,
      endDate,
      reason: reason.trim() || undefined,
    });

    // Reset form
    setStartDate('');
    setEndDate('');
    setReason('');
    onSaved();
  };

  const handleRemove = (id: string) => {
    removeBlockedDate(id);
    onSaved();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>Block Dates</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          Block dates for a property. Blocked dates will appear in the calendar and sync to Airbnb/Vrbo via the export URL.
        </Typography>

        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
          <InputLabel>Property</InputLabel>
          <Select
            value={propertyId}
            label="Property"
            onChange={e => setPropertyId(e.target.value)}
          >
            {properties.map(p => (
              <MenuItem key={p.id} value={p.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color }} />
                  {p.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField
            label="Start Date"
            type="date"
            fullWidth
            size="small"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="End Date"
            type="date"
            fullWidth
            size="small"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>

        <TextField
          label="Reason (optional)"
          fullWidth
          size="small"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g., Personal use, Maintenance"
          sx={{ mb: 1 }}
        />

        {error && (
          <Typography variant="caption" sx={{ color: '#f44336', display: 'block', mb: 1 }}>{error}</Typography>
        )}

        <Button variant="contained" onClick={handleAdd} fullWidth sx={{ mb: 2 }}>
          Block Dates
        </Button>

        {/* List existing blocked dates */}
        {blocked.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ color: '#666', mb: 1 }}>
              Currently Blocked
            </Typography>
            {blocked.map(b => {
              const prop = properties.find(p => p.id === b.propertyId);
              return (
                <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #eee' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: prop?.color || '#999', display: 'inline-block', mr: 0.5 }} />
                      {prop?.name || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      {b.startDate} to {b.endDate}
                      {b.reason && ` — ${b.reason}`}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleRemove(b.id)} color="error">
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              );
            })}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
