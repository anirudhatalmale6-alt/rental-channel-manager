'use client';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SyncIcon from '@mui/icons-material/Sync';
import { getProperties, saveProperty, updateProperty, deleteProperty, getSyncStatuses } from '@/lib/store';
import { syncProperty } from '@/lib/sync';
import { Property, SyncStatus, CHANNEL_LABELS, Channel } from '@/types';

export default function SettingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [name, setName] = useState('');
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [vrboUrl, setVrboUrl] = useState('');
  const [expediaUrl, setExpediaUrl] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setProperties(getProperties());
    setSyncStatuses(getSyncStatuses());
  }, []);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setAirbnbUrl('');
    setVrboUrl('');
    setExpediaUrl('');
    setDialog(true);
  };

  const openEdit = (property: Property) => {
    setEditing(property);
    setName(property.name);
    setAirbnbUrl(property.icalUrls.airbnb || '');
    setVrboUrl(property.icalUrls.vrbo || '');
    setExpediaUrl(property.icalUrls.expedia || '');
    setDialog(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setSnackbar({ open: true, message: 'Please enter a property name', severity: 'error' });
      return;
    }

    const icalUrls = {
      airbnb: airbnbUrl.trim() || undefined,
      vrbo: vrboUrl.trim() || undefined,
      expedia: expediaUrl.trim() || undefined,
    };

    if (editing) {
      updateProperty(editing.id, { name: name.trim(), icalUrls });
    } else {
      saveProperty({ name: name.trim(), icalUrls });
    }

    setProperties(getProperties());
    setDialog(false);
    setSnackbar({
      open: true,
      message: editing ? 'Property updated' : 'Property added',
      severity: 'success',
    });
  };

  const handleDelete = (id: string) => {
    deleteProperty(id);
    setProperties(getProperties());
    setDeleteConfirm(null);
    setSnackbar({ open: true, message: 'Property deleted', severity: 'success' });
  };

  const handleSync = async (propertyId: string) => {
    setSyncing(propertyId);
    try {
      await syncProperty(propertyId);
      setSyncStatuses(getSyncStatuses());
      setSnackbar({ open: true, message: 'Sync completed', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setSyncing(null);
    }
  };

  const getExportUrl = (propertyId: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/api/ical-feed/${propertyId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Properties</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} size="small">
          Add Property
        </Button>
      </Box>

      {properties.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ color: '#999', mb: 2 }}>No properties yet</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openAdd}>
              Add Your First Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        properties.map(property => {
          const status = syncStatuses.find(s => s.propertyId === property.id);
          const channels = Object.entries(property.icalUrls).filter(([, url]) => url);

          return (
            <Card key={property.id} sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: property.color }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{property.name}</Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleSync(property.id)} disabled={syncing === property.id}>
                      <SyncIcon sx={{
                        fontSize: 18,
                        animation: syncing === property.id ? 'spin 1s linear infinite' : 'none',
                        '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
                      }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => openEdit(property)}><EditIcon sx={{ fontSize: 18 }} /></IconButton>
                    <IconButton size="small" onClick={() => setDeleteConfirm(property.id)} color="error"><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                  </Box>
                </Box>

                {/* Connected channels */}
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                  {channels.map(([ch]) => (
                    <Chip key={ch} label={CHANNEL_LABELS[ch as Channel] || ch.charAt(0).toUpperCase() + ch.slice(1)} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                  ))}
                  {channels.length === 0 && (
                    <Typography variant="caption" sx={{ color: '#999' }}>No iCal feeds connected</Typography>
                  )}
                </Box>

                {/* Sync status */}
                {status && (
                  <Typography variant="caption" sx={{ color: status.status === 'error' ? '#f44336' : '#999' }}>
                    Last sync: {new Date(status.lastSync).toLocaleString()} — {status.status}
                    {status.error && ` (${status.error})`}
                  </Typography>
                )}

                {/* Export URL */}
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#999' }}>Export URL:</Typography>
                  <IconButton size="small" onClick={() => copyToClipboard(getExportUrl(property.id))}>
                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit Property' : 'Add Property'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Property Name"
            fullWidth
            value={name}
            onChange={e => setName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            placeholder="e.g., PM1 Petite Maison"
          />
          <Typography variant="subtitle2" sx={{ mb: 1, color: '#666' }}>
            iCal Export URLs (paste from each platform)
          </Typography>
          <TextField
            label="Airbnb iCal URL"
            fullWidth
            value={airbnbUrl}
            onChange={e => setAirbnbUrl(e.target.value)}
            sx={{ mb: 1.5 }}
            size="small"
            placeholder="https://www.airbnb.com/calendar/ical/..."
          />
          <TextField
            label="Vrbo iCal URL"
            fullWidth
            value={vrboUrl}
            onChange={e => setVrboUrl(e.target.value)}
            sx={{ mb: 1.5 }}
            size="small"
            placeholder="https://www.vrbo.com/icalendar/..."
          />
          <TextField
            label="Other iCal URL"
            fullWidth
            value={expediaUrl}
            onChange={e => setExpediaUrl(e.target.value)}
            size="small"
            placeholder="https://... (any iCal feed URL)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">{editing ? 'Save' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Property?</DialogTitle>
        <DialogContent>
          <Typography>This will remove the property and all its bookings. This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
