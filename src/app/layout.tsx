import type { Metadata, Viewport } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import theme from '@/lib/theme';
import BottomNav from '@/components/BottomNav';
import SWRegister from '@/components/SWRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kerlaret Rentals',
  description: 'Manage your rental properties across Airbnb, Vrbo and more',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1976D2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{
              minHeight: '100vh',
              bgcolor: 'background.default',
              pb: '80px',
              maxWidth: 600,
              mx: 'auto',
              '@media (orientation: landscape)': {
                maxWidth: '100%',
                pb: '56px',
              },
            }}>
              {children}
            </Box>
            <BottomNav />
            <SWRegister />
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
