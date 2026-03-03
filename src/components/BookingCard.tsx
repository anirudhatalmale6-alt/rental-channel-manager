'use client';
import { Booking } from '@/types';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import EuroIcon from '@mui/icons-material/Euro';
import ChannelIcon from './ChannelIcon';
import { formatDate, getNights } from '@/lib/date-utils';

export default function BookingCard({ booking }: { booking: Booking }) {
  const nights = getNights(booking.checkIn, booking.checkOut);

  return (
    <Card sx={{ mb: 1.5 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Dates */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <EventIcon sx={{ fontSize: 16, color: '#666' }} />
              <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>Arr./dep.</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatDate(booking.checkIn)}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatDate(booking.checkOut)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>
              {nights} night{nights !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 1.5 }} />

          {/* Guest */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <PersonIcon sx={{ fontSize: 16, color: '#666' }} />
              <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>Guest data</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {booking.guestName || 'Reserved'}
            </Typography>
            {(booking.adults > 0 || booking.children > 0) && (
              <Typography variant="caption" sx={{ color: '#999' }}>
                Adults {booking.adults} Children {booking.children}
              </Typography>
            )}
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 1.5 }} />

          {/* Income */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <EuroIcon sx={{ fontSize: 16, color: '#666' }} />
              <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>Income</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {booking.income > 0 ? `${booking.income.toFixed(2)} ${booking.currency}` : '—'}
            </Typography>
          </Box>
        </Box>

        {/* Channel */}
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChannelIcon channel={booking.channel} size="medium" />
        </Box>

        {/* Checklist */}
        {booking.checklist && booking.checklist.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {booking.checklist.map((item, i) => (
              <Typography key={i} variant="caption" sx={{ fontSize: 11, color: item.checked ? '#4CAF50' : '#999', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                {item.checked ? '✓' : '○'} {item.label}
              </Typography>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
