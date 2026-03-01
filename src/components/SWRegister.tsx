'use client';

import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // Check for updates every 5 minutes
        setInterval(() => reg.update(), 5 * 60 * 1000);
      });
    }
  }, []);

  return null;
}
