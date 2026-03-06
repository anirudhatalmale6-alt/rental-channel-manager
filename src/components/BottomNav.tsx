'use client';
import { usePathname, useRouter } from 'next/navigation';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';

const NAV_ITEMS = [
  { label: 'Home', icon: <HomeIcon />, path: '/' },
  { label: 'Calendar', icon: <CalendarMonthIcon />, path: '/calendar' },
  { label: 'Summary', icon: <ListAltIcon />, path: '/summary' },
  { label: 'Stats', icon: <BarChartIcon />, path: '/stats' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const currentIndex = NAV_ITEMS.findIndex(item =>
    pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
  );

  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}
      elevation={3}
    >
      <BottomNavigation
        value={currentIndex === -1 ? 0 : currentIndex}
        onChange={(_, newValue) => router.push(NAV_ITEMS[newValue].path)}
        showLabels
        sx={{
          height: 64,
          '@media (orientation: landscape)': { height: 48 },
        }}
      >
        {NAV_ITEMS.map(item => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={item.icon}
            sx={{ minWidth: 'auto' }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
