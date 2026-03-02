export interface Property {
  id: string;
  name: string;
  icalUrls: {
    airbnb?: string;
    vrbo?: string;
    expedia?: string;
  };
  color: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  propertyId: string;
  propertyName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  income: number;
  currency: string;
  channel: 'airbnb' | 'vrbo' | 'expedia' | 'manual' | 'blocked';
  status: 'confirmed' | 'pending' | 'cancelled' | 'blocked';
  uid: string;
  lastSynced?: string;
}

export interface BlockedDate {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface SyncStatus {
  propertyId: string;
  lastSync: string;
  status: 'success' | 'error' | 'syncing';
  error?: string;
}

export interface Stats {
  totalBookings: number;
  totalIncome: number;
  occupancyRate: number;
  avgNightlyRate: number;
  bookingsByChannel: Record<string, number>;
  monthlyIncome: { month: string; income: number }[];
}

export type Channel = 'airbnb' | 'vrbo' | 'expedia' | 'manual' | 'blocked';

export const CHANNEL_COLORS: Record<Channel, string> = {
  airbnb: '#FF5A5F',
  vrbo: '#3B5998',
  expedia: '#00355F',
  manual: '#4CAF50',
  blocked: '#9E9E9E',
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  airbnb: 'Airbnb',
  vrbo: 'Vrbo',
  expedia: 'Other',
  manual: 'Manual',
  blocked: 'Blocked',
};

export const PROPERTY_COLORS = [
  '#64B5F6', // light blue (PM1)
  '#F48FB1', // pink (PM2)
  '#FFD54F', // yellow (LONGERE)
  '#81C784', // green
  '#CE93D8', // purple
  '#4DD0E1', // cyan
];
