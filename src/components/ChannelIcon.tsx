'use client';
import { Channel, CHANNEL_COLORS, CHANNEL_LABELS } from '@/types';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

export default function ChannelIcon({ channel, size = 'small' }: { channel: Channel; size?: 'small' | 'medium' }) {
  const color = CHANNEL_COLORS[channel];
  const label = CHANNEL_LABELS[channel];

  if (size === 'small') {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: color,
          mr: 0.5,
        }}
        title={label}
      />
    );
  }

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor: color,
        color: '#fff',
        fontWeight: 600,
        fontSize: 11,
      }}
    />
  );
}
